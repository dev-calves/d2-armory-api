const axios = require('axios')
const jsonata = require('jsonata')
const { query, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const equipmentSlotTypes = require('./models/capture-equipment-slot-types')

/* GET equipments */
router.get('/capture', [
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
  const transformedResponse = transform(bungieResponse)

  // request to define the types of each equipment
  const definitionResponse = await definitionService(req, transformedResponse)

  // add slot types taken from definition to the capture response
  for (const item of transformedResponse.equipment) {
    item.equipmentSlotHash = definitionResponse.find(definition => definition.itemReferenceHash === item.itemReferenceHash).equipmentSlotHash
  }

  // place a slotType and name to each item from bungie's response
  // for (const item of transformedResponse.equipment) {
  //   for (const slotItem of definitionResponse) {
  //     if (item.itemReferenceHash === slotItem.itemReferenceHash) {
  //       item.slotType = slotItem.slotType
  //       item.name = slotItem.name
  //     }
  //   }
  // }
  // for (const item of transformedResponse.equipment) {
  //   if (item.itemReferenceHash === slotItem.itemReferenceHash) {
  //     item.slotType = slotItem.slotType
  //     item.name = slotItem.name
  //   }
  // }

  // TODO: call the item definition service to place the equipment slot type
  // to each weapon to then be filtered out.

  // filter out equipment to not capture
  // const clientResponse = {}
  const clientResponse = {
    equipment: transformedResponse.equipment.filter(item => equipmentSlotTypes.includes(item.equipmentSlotHash))
  }

  return clientResponse
}

async function definitionService (req, captureResponse) {
  const definitionData = {
    itemReferenceHashes: []
  }

  for (const item of captureResponse.equipment) {
    definitionData.itemReferenceHashes.push(item.itemReferenceHash)
  }

  // request options
  const definitionOption = {
    method: 'POST',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/definition/inventory-items`,
    data: definitionData
  }

  const definitionResponse = await request(definitionOption, req)

  return definitionResponse
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
              "equipment": Response.equipment.data.items.{
                "itemId": itemInstanceId,
                "itemReferenceHash": $string(itemHash)
              }
            }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
