const axios = require('axios')
const jsonata = require('jsonata')
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

const OauthUtility = require('../../utility/oauth/oauth')

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

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, request: req.body })

  return transferItemService(req).then(response => {
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
  body('items').notEmpty().withMessage('required parameter').isArray().withMessage('must be an array'),
  body('items.*.itemReferenceHash').notEmpty().withMessage('required parameter'),
  body('items.*.itemId').notEmpty().withMessage('required parameter'),
  body('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('characterId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, request: req.body })

  return transferItemsService(req).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function transferItemService (req, item) {
  // request options
  const transferItemOption = {
    method: 'POST',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Actions/Items/TransferItem`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: OauthUtility.authorization(req)
    },
    data: {
      itemReferenceHash: (item) ? item.itemReferenceHash : req.body.itemReferenceHash,
      itemId: (item) ? item.itemId : req.body.itemId,
      transferToVault: req.body.transferToVault,
      characterId: req.body.characterId,
      membershipType: req.body.membershipType
    }
  }

  let bungieResponse
  try {
    bungieResponse = await request(transferItemOption, req)
  } catch (error) {
    if (error && error.response && error.response.status === 401) {
      throw (error.response)
    } else {
      bungieResponse = error.response.data
    }
  }

  const clientResponse = transform(req, bungieResponse, item)

  return clientResponse
}

async function transferItemsService (req) {
  const listOfResponses = [] // holds the collective responses from the item transfer api

  for (const item of req.body.items) {
    const clientResponse = await transferItemService(req, item)

    listOfResponses.push(clientResponse)
  }

  return listOfResponses
}

async function request (transferItemOption, req) {
  logger.debug({ message: req.path, options: transferItemOption })

  const bungieResponse = await axios(transferItemOption)

  logger.debug({ message: req.path, bungieResponse: bungieResponse.data })

  return bungieResponse.data
}

function transform (req, bungieResponse, item) {
  // expression for transforming the response
  const expression = jsonata(`{ "itemId": ${(item) ? item.itemId : req.body.itemId}, "itemTransfered": **.ErrorStatus }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  return response
}
