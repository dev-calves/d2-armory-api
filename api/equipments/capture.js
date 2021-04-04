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
 * returns the current equipment worn by the specified character.S
 */
/* GET capture */
router.get('/capture', [
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

  return captureService(req, res, req.query.membershipType, req.query.membershipId, req.query.characterId).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

/**
 * builds the request for the bungie profile api
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @param {string} membershipType device platform the account is tied too.
 * @param {string} membershipId account id.
 * @param {string} characterId character id.
 * @returns transformed response from bungie.
 */
async function captureService (req, res, membershipType, membershipId, characterId) {
  // request options
  const equipmentsOption = {
    method: 'GET',
    baseURL: process.env.BUNGIE_DOMAIN,
    url: `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=205`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  const bungieResponse = await utility.oauth.request(equipmentsOption, req, res)

  // trim content
  const clientResponse = transform(bungieResponse.data)

  return clientResponse
}

/**
 * transforms data from bungie.
 * @param {*} bungieResponse Bungie response.
 * @returns transformed response.
 */
function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`{
              "equipment": ${jsonataModels.equipment}
            }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
