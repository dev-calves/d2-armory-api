const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')

const utility = require('../../utility')
const validations = require('../../utility/validations')

const router = express.Router()

/**
 * returns an item's info.
 */
/* GET inventory-item */
router.get('/inventory-item', [
  // validations
  validations.query.itemHash
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

/**
 * returns a list of info on items.
 */
/* POST inventory-items */
router.post('/inventory-items', [
  // validations
  validations.body.itemHashes
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

/**
 * builds a request to the destinyinventoryitemdefinition.
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @param {string} itemHash item reference hash, used by bungie's apis.
 * @returns transformed response from bungie.
 */
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

  const bungieResponse = await utility.oauth.request(definitionOption, req, res)

  // trim content
  const clientResponse = transform(bungieResponse.data)

  // if array is empty, then the hash isn't valid for this definition type.
  if (Object.keys(clientResponse).length === 0 && clientResponse.constructor === Object) {
    throw createError(500, 'the hash provided does not apply to the given category parameter.')
  }

  clientResponse.itemHash = itemHash

  return clientResponse
}

/**
 * transforms bungie data.
 * @param {*} definitionResponse bungie response.
 * @returns transformed data.
 */
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
