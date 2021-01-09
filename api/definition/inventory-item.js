const axios = require('axios')
const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

/* GET Definition */
router.get('/inventory-item', [
  // validations
  query('itemReferenceHash').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.query })

  return inventoryItemService(req, req.query.itemReferenceHash).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

/* POST Definition */
router.post('/inventory-items', [
  // validations
  body('itemReferenceHashes').notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be in the form of an array'),
  body('itemReferenceHashes[*]').isString().withMessage('must be a string')
    .isInt().withMessage('string must only contain an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  const requests = []

  for (const itemReferenceHash of req.body.itemReferenceHashes) {
    requests.push(inventoryItemService(req, itemReferenceHash))
  }

  return Promise.all(requests).then(response => {
    logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error.response)
    return
  })
})

module.exports = router

async function inventoryItemService (req, itemReferenceHash) {
  // request options
  const definitionOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemReferenceHash}`,
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  const bungieResponse = await request(definitionOption, req)

  // trim content
  const clientResponse = transform(bungieResponse)

  // if array is empty, then the hash isn't valid for this definition type.
  if (Object.keys(clientResponse).length === 0 && clientResponse.constructor === Object) {
    throw createError(500, 'the hash provided does not apply to the given category parameter.')
  }

  clientResponse.itemReferenceHash = itemReferenceHash

  return clientResponse
}

async function request (definitionOption, req) {
  logger.debug({ message: req.path, options: definitionOption })

  const definitionResponse = await axios(definitionOption)

  logger.debug({ message: req.path, bungieResponse: definitionResponse.data })

  return definitionResponse.data
}

function transform (definitionResponse) {
  // expression for transforming the response
  const expression =
          jsonata(`{
            "name": Response.displayProperties.name,
            "maxStackSize": Response.inventory.maxStackSize,
            "equipmentSlotHash": $string(Response.equippingBlock.equipmentSlotTypeHash)
        }`)

  // response transformed
  const response = expression.evaluate(definitionResponse)

  return response
}
