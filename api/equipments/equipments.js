const axios = require('axios')
const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

const OauthUtility = require('../../utility/oauth/oauth')
const ErrorCodesEnum = require('../../utility/models/error-codes.enum')

const equipmentList = require('./models/equipment-list')

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
    data: {
      transferToVault: true,
      items: captureResponse.equipment,
      characterId: req.body.characterId,
      membershipType: req.body.membershipType
    }
  }

  const transferResponse = await request(transferItemsOption, req)

  return transferResponse
}

async function definitionService (req, captureResponse) {
  // request options
  const definitionOption = {
    method: 'POST',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/definition/equipment-slots`,
    data: captureResponse
  }

  const definitionResponse = await request(definitionOption, req)

  return definitionResponse
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
  const bungieResponse = await request(equipmentsOption, req)

  // trim content
  const transformedResponse = transform(bungieResponse, 'capture', req)

  // request to define the types of each equipment
  const definitionResponse = await definitionService(req, transformedResponse)

  // filter out equipment to not capture
  const clientResponse = definitionResponse.filter(item => equipmentList.includes(item.slotType))

  return clientResponse
}

async function request (equipmentsOption, req) {
  logger.debug({ message: req.path, options: equipmentsOption })

  const equipmentsResponse = await axios(equipmentsOption)

  logger.debug({ message: req.path, bungieResponse: equipmentsResponse.data })

  return equipmentsResponse.data
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
