const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const utility = require('../../utility')
const validations = require('../../utility/validations/query')
const jsonataModels = require('../../utility/models/jsonata')

/* GET vault */
router.get('/vault', [
  // validations
  validations.membershipId,
  validations.membershipType
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

  return inventoryService(req, res, req.query.membershipType, req.query.membershipId).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function inventoryService (req, res, membershipType, membershipId) {
  // request options
  const inventoryOption = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: `/Platform/Destiny2/${membershipType}/Profile/${membershipId}?components=102`,
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

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`
        {
            "vault": ${jsonataModels.vault}
        }`
  )

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
