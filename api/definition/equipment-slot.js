const axios = require('axios')
const jsonata = require('jsonata')
const { query, body, validationResult } = require('express-validator')
const createError = require('http-errors')
const logger = require('../../winston')
const express = require('express')

const router = express.Router()

/* GET Definition */
router.get('/equipment-slot', [
  // validations
  query().custom((value, { req }) => {
    if (!req.query.itemHash && !req.query.equipmentSlotHash) {
      throw new Error('either \'itemHash\' or \'equipmentSlotHash\' must be provided')
    }
    return true
  }),
  query('itemHash').optional().isInt().withMessage('must be an int'),
  query('equipmentSlotHash').optional().isInt().withMessage('must be an integer').custom((value, { req }) => {
    if (value && req.query.itemHash) {
      throw new Error('must be omitted if an inventoryHash is provided')
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
    return inventoryItemService(req).then(inventoryItemResponse => {
      logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: inventoryItemResponse })

      return equipmentSlotService(req, inventoryItemResponse.equipmentSlotHash, req.query.itemHash, inventoryItemResponse.name).then(equipmentSlotResponse => {
        logger.debug({ message: `${req.path} - equipmentSlot`, clientResponse: equipmentSlotResponse })

        return res.status(200).json(equipmentSlotResponse)
      })
    }).catch(error => {
      next(error)
      return
    })
  } else {
    return equipmentSlotService(req, req.query.equipmentSlotHash).then(equipmentSlotResponse => {
      logger.debug({ message: req.path, clientResponse: equipmentSlotResponse })

      return res.status(200).json(equipmentSlotResponse)
    }).catch(error => {
      next(error)
      return
    })
  }
})

/* POST Definition */
router.post('/equipment-slots', [
  // validations
  body('itemHashes').notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be in the form of an array'),
  body('itemHashes[*]').isString().withMessage('must be a string')
    .isInt().withMessage('string must only contain an integer')
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

  return inventoryItemService(req, req.body).then(inventoryItemResponse => {
    const requests = []

    for (const item of inventoryItemResponse) {
      requests.push(equipmentSlotService(req, item.equipmentSlotHash, item.itemHash, item.name))
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

async function equipmentSlotService (req, equipmentSlotHash, itemHash, itemName) {
  const equipmentSlotDefinitionOption = {
    method: 'GET',
    url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Manifest/DestinyEquipmentSlotDefinition/${equipmentSlotHash}`,
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  const bungieResponse = await request(equipmentSlotDefinitionOption, req)

  // trim content
  const clientResponse = transform(bungieResponse)

  // if array is empty, then the hash isn't valid for this definition type.
  if (Object.keys(clientResponse).length === 0 && clientResponse.constructor === Object) {
    throw createError(500, 'the hash provided does not apply to the given category parameter.')
  }

  clientResponse.itemHash = itemHash || undefined
  clientResponse.name = itemName || undefined
  clientResponse.equipmentSlotHash = equipmentSlotHash || undefined

  return clientResponse
}

async function inventoryItemService (req, itemHashes) {
  // request options
  let inventoryItemOption = {}

  if (req.method.toUpperCase() === 'GET') {
    inventoryItemOption = {
      method: 'GET',
      url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/definition/inventory-item?itemHash=${req.query.itemHash}`
    }
  } else if (req.method.toUpperCase() === 'POST') {
    inventoryItemOption = {
      method: 'POST',
      url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/definition/inventory-items`,
      data: req.body
    }
  } else {
    throw (createError(500, 'method not available for this route'))
  }

  const inventoryItemResponse = await request(inventoryItemOption, req)

  return inventoryItemResponse
}

async function request (definitionOption, req) {
  logger.debug({ message: req.path, options: definitionOption })

  const definitionResponse = await axios(definitionOption)

  logger.debug({ message: req.path, bungieResponse: definitionResponse.data })

  return definitionResponse.data
}

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
