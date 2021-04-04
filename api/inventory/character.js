const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const utility = require('../../utility')
const jsonataModels = require('../../utility/models/jsonata')
const validations = require('../../utility/validations/query')

/**
 * returns the list of items in the character's inventory.
 */
/* GET character */
router.get('/character', [
  // validations
  validations.membershipId,
  validations.membershipType,
  validations.characterId
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

  return inventoryService(req, res, req.query.membershipType, req.query.membershipId, req.query.characterId).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

/**
 * returns a transformed response from bungie.
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @param {string} membershipType device associated with the creation of the account.
 * @param {string} membershipId account id.
 * @param {string} characterId character id.
 * @returns transformed response from bungie.
 */
async function inventoryService (req, res, membershipType, membershipId, characterId) {
  // request options
  const inventoryOption = {
    method: 'GET',
    baseURL: process.env.BUNGIE_DOMAIN,
    url: `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=201`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: await utility.oauth.authorization(req, res)
    }
  }

  const bungieResponse = await utility.oauth.request(inventoryOption, req, res)

  const clientResponse = transform(bungieResponse.data)

  return clientResponse
}

/**
 * transforms the response from bungie.
 * @param {*} bungieResponse bungie response.
 * @returns transformed data.
 */
function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`{
    "character": {
        "equipment": ${jsonataModels.equipment}
    }
  }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
