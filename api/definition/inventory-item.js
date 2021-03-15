const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')

const oAuthUtility = require('../../utility/oauth/oauth')

const router = express.Router()

/* GET Definition */
router.get('/inventory-item', [
  // validations
  query('itemHash').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    next(createError(422, message))
    return
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.query })

  return inventoryItemService(req, res, req.query.itemHash).then(response => {
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
  body('itemHashes').notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('itemHashes[*]').isString().withMessage('must be a string')
    .isInt().withMessage('string must only contain an integer')
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

  const requests = []

  for (const itemHash of req.body.itemHashes) {
    requests.push(inventoryItemService(req, res, itemHash))
  }

  return Promise.all(requests).then(response => {
    logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function inventoryItemService (req, res, itemHash) {
  // request options
  const definitionOption = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: `/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY
    }
  }

  const bungieResponse = await oAuthUtility.request(definitionOption, req, res)

  // trim content
  const clientResponse = transform(bungieResponse.data)

  // if array is empty, then the hash isn't valid for this definition type.
  if (Object.keys(clientResponse).length === 0 && clientResponse.constructor === Object) {
    throw createError(500, 'the hash provided does not apply to the given category parameter.')
  }

  clientResponse.itemHash = itemHash

  return clientResponse
}

function transform (definitionResponse) {
  // expression for transforming the response
  const expression =
          jsonata(`{
            "itemHash": Response.hash,
            "name": Response.displayProperties.name,
            "maxStackSize": Response.inventory.maxStackSize,
            "equipmentSlotHash": $string(Response.equippingBlock.equipmentSlotTypeHash)
        }`)

  // response transformed
  const response = expression.evaluate(definitionResponse)

  return response
}
