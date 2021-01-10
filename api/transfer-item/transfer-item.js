const axios = require('axios')
const jsonata = require('jsonata')
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const oAuthUtility = require('../../utility/oauth/oauth')

/* POST transfer-item */
router.post('/transfer-item', [
  // validations
  body('itemReferenceHash').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('transferToVault').notEmpty().withMessage('required parameter').isBoolean().withMessage('must be a boolean'),
  body('itemId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('characterId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    next(createError(422, message))
    return
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  return transferItemService(req, req.body.membershipType, req.body.characterId, req.body.transferToVault, req.body.itemId, req.body.itemReferenceHash).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

/* POST transfer-items */
router.post('/transfer-items', [
  // validations
  body('transferToVault').notEmpty().withMessage('required parameter').isBoolean().withMessage('must be a boolean'),
  body('equipment').notEmpty().withMessage('required parameter').isArray().withMessage('must be an array'),
  body('equipment[*].itemReferenceHash').notEmpty().withMessage('required parameter'),
  body('equipment[*].itemId').notEmpty().withMessage('required parameter'),
  body('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('characterId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    next(createError(422, message))
    return
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  const transfers = [] // holds the collective responses from the item transfer api

  for (const item of req.body.equipment) {
    transfers.push(transferItemService(req, req.body.membershipType, req.body.characterId, req.body.transferToVault, item.itemId, item.itemReferenceHash))
  }

  return Promise.all(transfers).then(response => {
    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function transferItemService (req, membershipType, characterId, transferToVault, itemId, itemReferenceHash) {
  // request options
  const transferItemOption = {
    method: 'POST',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Actions/Items/TransferItem`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: oAuthUtility.authorization(req)
    },
    data: {
      itemReferenceHash: itemReferenceHash,
      itemId: itemId,
      transferToVault: transferToVault,
      characterId: characterId,
      membershipType: membershipType
    }
  }

  // itemnotfounds are returned as errors by bungie.
  const bungieResponse = await request(transferItemOption, req)

  const clientResponse = transform(bungieResponse)
  clientResponse.itemId = itemId

  return clientResponse
}

async function request (transferItemOption, req) {
  logger.debug({ message: req.path, options: transferItemOption })

  const bungieResponse = await axios(transferItemOption)

  logger.debug({ message: req.path, bungieResponse: bungieResponse.data })

  return bungieResponse.data
}

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata('{ "itemTransfered": **.ErrorStatus }')

  // response transformed
  const response = expression.evaluate(bungieResponse)

  return response
}
