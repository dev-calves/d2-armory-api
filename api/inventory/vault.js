const axios = require('axios')
const jsonata = require('jsonata')
const { query, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const oAuthUtility = require('../../utility/oauth/oauth')
const bucketHash = require('../../utility/models/bucket-hash')

/* GET vault */
router.get('/vault', [
  // validations
  query('membershipId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  query('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
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

  return inventoryService(req, req.query.membershipType, req.query.membershipId).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function inventoryService (req, membershipType, membershipId) {
  // request options
  const inventoryOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/${membershipType}/Profile/${membershipId}?components=102`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: oAuthUtility.authorization(req)
    }
  }

  const bungieResponse = await request(inventoryOption, req)

  const clientResponse = transform(bungieResponse)

  return clientResponse
}

async function request (inventoryOption, req) {
  logger.debug({ message: req.path, options: inventoryOption })

  const bungieResponse = await axios(inventoryOption)

  logger.debug({ message: req.path, bungieResponse: bungieResponse.data })

  return bungieResponse.data
}

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`
        {
            "vault": {
                "equipment": Response.profileInventory.data.items[bucketHash=${bucketHash.GENERAL}].
                    {
                        "itemHash": itemHash,
                        "itemInstanceId": itemInstanceId,
                        "bucketHash": bucketHash
                    }
            }
        }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
