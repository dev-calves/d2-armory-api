const axios = require('axios')
const jsonata = require('jsonata')
const { param, query, validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

/* GET Definition */
router.get('/definition/:category', [
  // validations
  param('category').isIn(['inventoryItem', 'equipmentSlot']).withMessage('must be \'inventoryItem\' or \'equipmentSlot\''),
  query('hash').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, request: req.query })

  return definitionService(req, res).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    if (Object.keys(response).length === 0 && response.constructor === Object) {
      throw createError(500, 'the hash provided does not apply to the given category parameter.')
    }

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function definitionService (req, next) {
  // request options
  const definitionOption = {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  switch (req.params.category) {
    case 'inventoryItem':
      definitionOption.url = `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${req.query.hash}`
      break
    case 'equipmentSlot':
      definitionOption.url = `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Manifest/DestinyEquipmentSlotDefinition/${req.query.hash}`
      break
    default:
      // shouldn't be reachable but if so, throw an error.
      throw createError(422, 'not a valid value for the route \'api/definition/:category\'')
  }

  // request characters
  let definitionResponse
  try {
    definitionResponse = await request(definitionOption, req)
  } catch (error) {
    throw (error.response)
  }

  // trim content
  const response = transform(definitionResponse)

  return response
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
            "maxStackSize": Response.inventory.maxStackSize
        }`)

  // response transformed
  const response = expression.evaluate(definitionResponse)

  return response
}
