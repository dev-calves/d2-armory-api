const axios = require('axios')
const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const jsonataModels = require('../../utility/models/jsonata')
const validations = require('../../utility/validations/query')

/* GET equipments */
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

  return captureService(req, req.query.membershipType, req.query.membershipId, req.query.characterId).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function captureService (req, membershipType, membershipId, characterId) {
  // request options
  const equipmentsOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=205`,
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  const bungieResponse = await request(equipmentsOption, req)

  // trim content
  const clientResponse = transform(bungieResponse)

  return clientResponse
}

async function request (equipmentsOption, req) {
  logger.debug({ message: req.path, options: equipmentsOption })

  const equipmentsResponse = await axios(equipmentsOption)

  if (equipmentsOption.url.includes(process.env.SERVER_DOMAIN)) {
    logger.debug({ message: req.path, definitionResponse: equipmentsResponse.data })
  } else {
    logger.debug({ message: req.path, bungieResponse: equipmentsResponse.data })
  }

  return equipmentsResponse.data
}

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
