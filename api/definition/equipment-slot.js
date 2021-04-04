const jsonata = require('jsonata')
const { query, validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')
const router = express.Router()

const utility = require('../../utility')

/**
 * returns the equipment slot type info of an item.
 */
/* GET equipment-slot */
router.get('/equipment-slot', [
  // validations
  query().custom((value, { req }) => {
    if (!req.query.itemHash && !req.query.equipmentSlotHash) {
      throw new Error('either \'itemHash\' or \'equipmentSlotHash\' must be provided')
    }
    return true
  }),
  query('itemHash')
    .optional()
    .isNumeric().withMessage('must only contain numbers'),
  query('equipmentSlotHash')
    .optional()
    .isNumeric().withMessage('must only contain numbers')
    .custom((value, { req }) => {
      if (value && req.query.itemHash) {
        throw new Error('must be omitted if an itemHash is provided')
      } else {
        return true
      }
    })
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

  if (req.query.itemHash) {
    return utility.requests.definitionInventoryItem(req, res, req.query.itemHash).then(inventoryItemResponse => {
      logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: inventoryItemResponse })

      return equipmentSlotService(req, res, inventoryItemResponse.equipmentSlotHash, req.query.itemHash, inventoryItemResponse.name).then(equipmentSlotResponse => {
        logger.debug({ message: `${req.path} - equipmentSlot`, clientResponse: equipmentSlotResponse })

        return res.status(200).json(equipmentSlotResponse)
      })
    }).catch(error => {
      next(error)
      return
    })
  } else {
    return equipmentSlotService(req, res, req.query.equipmentSlotHash).then(equipmentSlotResponse => {
      logger.debug({ message: req.path, clientResponse: equipmentSlotResponse })

      return res.status(200).json(equipmentSlotResponse)
    }).catch(error => {
      next(error)
      return
    })
  }
})

/**
 * returns the equipment slot type of a list of items.
 */
/* POST equipment-slots */
router.post('/equipment-slots', [
  // validations
  utility.validations.body.itemHashes
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

  return utility.requests.definitionInventoryItems(req, res, req.body).then(inventoryItemResponse => {
    const requests = []

    for (const item of inventoryItemResponse) {
      requests.push(equipmentSlotService(req, res, item.equipmentSlotHash, item.itemHash, item.name))
    }

    Promise.all(requests).then(response => {
      return res.status(200).json(response)
    })
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

/**
 * builds a request to bungie's destinyequipmentslotdefinition api
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @param {string} equipmentSlotHash reference hash for an equipment slot type, used by bungie's apis.
 * @param {string} itemHash item reference hash for items, used by bungie's apis.
 * @param {string} itemName name of the item, determined by the definition service.
 * @returns response for the client
 */
async function equipmentSlotService (req, res, equipmentSlotHash, itemHash, itemName) {
  const equipmentSlotDefinitionOption = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: `/Platform/Destiny2/Manifest/DestinyEquipmentSlotDefinition/${equipmentSlotHash}`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY
    }
  }

  const bungieResponse = await utility.oauth.request(equipmentSlotDefinitionOption, req, res)

  // trim content
  const clientResponse = transform(bungieResponse.data)

  // if array is empty, then the hash isn't valid for this definition type.
  if (Object.keys(clientResponse).length === 0 && clientResponse.constructor === Object) {
    throw createError(500, 'the hash provided does not apply to the given category parameter.')
  }

  clientResponse.itemHash = itemHash || undefined
  clientResponse.name = itemName || undefined
  clientResponse.equipmentSlotHash = equipmentSlotHash || undefined

  return clientResponse
}

/**
 * returns a transformed response for the client.
 * @param {*} definitionResponse bungie response.
 * @returns transformed data.
 */
function transform (definitionResponse) {
  // expression for transforming the response
  const expression =
          jsonata(`{
              "slotType": Response.displayProperties.name
          }`)

  // response transformed
  const response = expression.evaluate(definitionResponse)

  return response
}
