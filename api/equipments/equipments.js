const axios = require('axios')
const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

const OauthUtility = require('../../utility/oauth/oauth')

/* GET equipments */
router.get('/equipments/capture', [
  // validations
  query('membershipId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  query('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  query('characterId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, request: req.query })

  return captureService(req, res).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

/* POST equipments */
router.post('/equipments/dawn', [
  // validations
  body('itemIds').isArray().withMessage('must be an array of int'),
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

  return dawnService(req, res).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

async function dawnService (req, next) {
  // request options
  const equipmentsOption = {
    method: 'POST',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Actions/Items/EquipItems`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: OauthUtility.authorization(req)
    },
    data: req.body
  }
  const clientResponse = {
    equipStatus: 'fail'
  }

  let response
  try {
    response = await request(equipmentsOption, req)
  } catch (error) {
    throw (error.response)
  }

  if (response &&
    response.ErrorStatus.includes('Success') &&
    response.Message.includes('Ok')) {
    clientResponse.equipStatus = 'success'
  }

  return clientResponse
}

async function captureService (req, next) {
  // request options
  const equipmentsOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/${req.query.membershipType}/Profile/${req.query.membershipId}/Character/${req.query.characterId}?components=205`,
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  let equipmentsResponse
  try {
    equipmentsResponse = await request(equipmentsOption, req)
  } catch (error) {
    throw (error.response)
  }

  // trim content
  const response = transform(equipmentsResponse)

  return response
}

async function request (equipmentsOption, req) {
  logger.debug({ message: req.path, options: equipmentsOption })

  const equipmentsResponse = await axios(equipmentsOption)

  logger.debug({ message: req.path, bungieResponse: equipmentsResponse.data })

  return equipmentsResponse.data
}

function transform (equipmentsResponse) {
  // expression for transforming the response
  const expression = jsonata('Response.equipment.data.{"equipmentIds": items.itemInstanceId}')

  // response transformed
  const response = expression.evaluate(equipmentsResponse)

  return response
}
