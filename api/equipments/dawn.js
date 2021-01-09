const axios = require('axios')
const jsonata = require('jsonata')
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const OauthUtility = require('../../utility/oauth/oauth')
const ErrorCodesEnum = require('../../utility/models/error-codes.enum')

/* POST equipments */
router.post('/dawn', [
  // validations
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

    next(createError(422, message))
    return
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  if (req.body && req.body.transferLocation && req.body.transferLocation === 'vault') {
    return captureService(req, req.body.membershipType, req.body.membershipId, req.body.characterId).then(captureResponse => {
      logger.debug({ message: `${req.path} - capture`, captureResponse: captureResponse })

      return dawnService(req, req.body).then(clientResponse => {
        logger.debug({ message: `${req.path} - dawn`, clientResponse: clientResponse })

        return transferItemsService(req, captureResponse, req.body.characterId, req.body.membershipType).then(transferResponse => {
          logger.debug({ message: `${req.path} - transfer-items`, transferResponse: transferResponse })

          clientResponse.transferredItems = transferResponse

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
    return dawnService(req, req.body).then(response => {
      logger.debug({ message: req.path, clientResponse: response })

      return res.status(200).json(response)
    }).catch(error => {
      next(error)
      return
    })
  }
})

module.exports = router

async function dawnService (req, body) {
  // request options
  const equipmentsOption = {
    method: 'POST',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Actions/Items/EquipItems`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: OauthUtility.authorization(req)
    },
    data: body
  }

  const bungieResponse = await request(equipmentsOption, req)

  const clientResponse = transform(bungieResponse)

  // replace bungie's integer error code with a message, taken from bungie's platform site.
  clientResponse.equipment.forEach(item => {
    item.equipStatus = ErrorCodesEnum(item.equipStatus, req.path)
  })

  return clientResponse
}

async function captureService (req, membershipType, membershipId, characterId) {
  // request options
  const captureOption = {
    method: 'GET',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/equipment/capture?membershipType=${membershipType}&membershipId=${membershipId}&characterId=${characterId}`
  }

  const captureResponse = await request(captureOption, req)

  return captureResponse
}

async function transferItemsService (req, captureResponse, characterId, membershipType) {
  // request options
  const transferItemsOption = {
    method: 'POST',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/transfer-items`,
    headers: req.headers,
    data: {
      transferToVault: true,
      items: captureResponse.equipment,
      characterId: characterId,
      membershipType: membershipType
    }
  }

  const transferResponse = await request(transferItemsOption, req)

  return transferResponse
}

async function request (equipmentsOption, req) {
  logger.debug({ message: req.path, options: equipmentsOption })

  const equipmentsResponse = await axios(equipmentsOption)

  logger.debug({ message: req.path, bungieResponse: equipmentsResponse.data })

  return equipmentsResponse.data
}

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`
        {
          "equipment": Response.equipResults.{
              "itemId": itemInstanceId,
              "equipStatus": equipStatus
          }
        }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
