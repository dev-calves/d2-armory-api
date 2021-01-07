const axios = require('axios')
const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

const OauthUtility = require('../../utility/oauth/oauth')
const ErrorCodesEnum = require('../../utility/models/error-codes.enum')

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

  logger.debug({ message: req.path, headers: req.headers, request: req.query })

  return captureService(req, res).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    // TODO: call the definition service on each item to determine the slot type of each item.
    // TODO: create a list of approved slot types.
    // TODO: remove items from the response that are not approved slot types.

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
  body('membershipId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('characterId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  body('transferLocation').optional().isIn(['inventory', 'vault']).withMessage('optional parameter. If declared, must be either \'vault\', \'inventory\'')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  if (req.body && req.body.transferLocation && req.body.transferLocation === 'vault') {
    return captureService(req).then(captureResponse => {
      logger.debug({ message: `${req.path} - capture`, captureResponse: captureResponse })

      return dawnService(req).then(clientResponse => {
        logger.debug({ message: `${req.path} - dawn`, clientResponse: clientResponse })

        return transferItemsService(req, captureResponse).then(transferResponse => {
          logger.debug({ message: `${req.path} - transfer-items`, transferResponse: transferResponse })

          return res.status(200).json(clientResponse)
        }).catch(error => {
          next(error)
          return
        })
      }).catch(error => {
        next(error)
        return
      })
    }).catch(error => {
      next(error)
      return
    })
  } else {
    return dawnService(req).then(response => {
      logger.debug({ message: req.path, clientResponse: response })

      return res.status(200).json(response)
    }).catch(error => {
      next(error)
      return
    })
  }
})

module.exports = router

async function transferItemsService (req, captureResponse) {
  // request options
  const transferItemsOption = {
    method: 'POST',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/transfer-items`,
    headers: req.headers,
    data: {
      transferToVault: true,
      items: captureResponse.equipment,
      characterId: req.body.characterId,
      membershipType: req.body.membershipType
    }
  }

  let transferResponse
  try {
    transferResponse = await transferItemsRequest(transferItemsOption, req)
  } catch (error) {
    throw (error.response)
  }

  return transferResponse
}

async function definitionService (req, captureResponse) {
  // TODO: change the code in here to call a post route.

  // request options
  const transferItemsOption = {
    method: 'POST',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/transfer-items`,
    headers: req.headers,
    data: {
      transferToVault: true,
      items: captureResponse.equipment,
      characterId: req.body.characterId,
      membershipType: req.body.membershipType
    }
  }

  let transferResponse
  try {
    transferResponse = await transferItemsRequest(transferItemsOption, req)
  } catch (error) {
    throw (error.response)
  }

  return transferResponse
}

async function dawnService (req) {
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

  let bungieResponse
  try {
    bungieResponse = await request(equipmentsOption, req)
  } catch (error) {
    throw (error.response)
  }

  const clientResponse = transform(bungieResponse, 'dawn', req)

  return clientResponse
}

async function captureService (req) {
  // request options
  const equipmentsOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/${req.query.membershipType || req.body.membershipType}/Profile/${req.query.membershipId || req.body.membershipId}/Character/${req.query.characterId || req.body.characterId}?components=205`,
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  let bungieResponse
  try {
    bungieResponse = await request(equipmentsOption, req)
  } catch (error) {
    throw (error.response)
  }

  // trim content
  const transformedResponse = transform(bungieResponse, 'capture', req)

  let definitionResponse
  try {
    definitionResponse = await definitionRequest(transformedResponse, req)
  } catch (error) {
    throw (error.response)
  }

  // TODO: filter out artifact item, vehicle, ghost, ship, finishers, emotes, etc..

  // TODO: return filtered response.

  // // trim content
  // const clientResponse = transform(bungieResponse, 'capture', req)

  return transformedResponse
}

async function request (equipmentsOption, req) {
  logger.debug({ message: `${req.path} - capture`, options: equipmentsOption })

  const equipmentsResponse = await axios(equipmentsOption)

  logger.debug({ message: `${req.path} - capture`, bungieResponse: equipmentsResponse.data })

  return equipmentsResponse.data
}

async function definitionRequest (equipment, req) {
  // TODO: log and send a list of items to the equipment api
}

async function transferItemsRequest (transferItemsOption, req) {
  logger.debug({ message: req.path, options: transferItemsOption })

  const transferItemsResponse = await axios(transferItemsOption)

  logger.debug({ message: req.path, transferItemsResponse: transferItemsResponse.data })

  return transferItemsResponse.data
}

function transform (equipmentsResponse, type, req) {
  // expression for transforming the response
  let expression

  switch (type) {
    case 'capture':
      expression = jsonata(`
          {
            "equipment": Response.equipment.data.items.{
              "itemId": itemInstanceId,
              "itemReferenceHash": $string(itemHash)
            }
          }`)
      break

    case 'dawn':
      expression = jsonata(`
      {
        "equipment": Response.equipResults.{
            "itemId": itemInstanceId,
            "equipStatus": equipStatus
        }
      }`)
      break

    default:
      throw new Error('equipments service transformer is missing a type.')
  }

  // response transformed
  const response = expression.evaluate(equipmentsResponse)

  // replace bungie's integer error code with a message, taken from bungie's platform site.
  if (type === 'dawn') {
    response.equipment.forEach(item => {
      item.equipStatus = ErrorCodesEnum(item.equipStatus, req.path)
    })
  }

  // return
  return response
}
