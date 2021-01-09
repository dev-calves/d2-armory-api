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
  query('inventoryHash').optional().isInt().withMessage('must be an int'),
  query('equipmentSlotHash').optional().isInt().withMessage('must be an integer').custom((value, { req }) => {
    if (value && req.query.inventoryHash) {
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

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.query })

  if (req.query.inventoryHash) {
    return inventoryItemService(req, req.query.inventoryHash).then(inventoryItemResponse => {
      logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: inventoryItemResponse })

      return equipmentSlotService(req, inventoryItemResponse.equipmentSlotHash, req.query.inventoryHash, inventoryItemResponse.name).then(equipmentSlotResponse => {
        logger.debug({ message: `${req.path} - equipmentSlot`, clientResponse: equipmentSlotResponse })

        return res.status(200).json(equipmentSlotResponse)
      }).catch(error => {
        next(error)
        return
      })
    })
  } else {
    return equipmentSlotService(req, req.query.equipmentSlotHash).then(equipmentSlotResponse => {
      logger.debug({ message: req.path, clientResponse: equipmentSlotResponse })

      equipmentSlotResponse.equipmentSlotHash = req.query.equipmentSlotHash

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
  body('equipment').notEmpty().withMessage('required parameter').isArray().withMessage('must be an array'),
  body('equipment[*].itemReferenceHash').notEmpty().withMessage('required parameter')
    .isString().withMessage('must be a string')
    .isInt().withMessage('string must only contain an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  const requests = []

  for (const item of req.body.equipment) {
    requests.push(inventoryItemService(req, item.itemReferenceHash)
      .then(inventoryItemResponse => {
        logger.debug({ message: `${req.path} - inventoryItem`, clientResponse: inventoryItemResponse })

        return equipmentSlotService(req, inventoryItemResponse.equipmentSlotHash, item.itemReferenceHash, inventoryItemResponse.name)
          .then(equipmentSlotResponse => {
            logger.debug({ message: `${req.path} - equipmentSlot`, clientResponse: equipmentSlotResponse })

            return equipmentSlotResponse
          }).catch(error => {
            next(error)
            return
          })
      }))
  }

  return Promise.all(requests).then(response => {
    return res.status(200).json(response)
  })
})

module.exports = router

async function equipmentSlotService (req, equipmentSlotHash, itemReferenceHash, itemName) {
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

  clientResponse.itemReferenceHash = itemReferenceHash || undefined
  clientResponse.name = itemName || undefined

  return clientResponse
}

async function inventoryItemService (req, itemReferenceHash) {
  // request options
  const inventoryItemOption = {
    method: 'GET',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/definition/inventory-item?itemReferenceHash=${itemReferenceHash}`
  }

  const inventoryItemResponse = await request(inventoryItemOption, req)

  return inventoryItemResponse
}

async function request (definitionOption, req) {
  logger.debug({ message: req.path, options: definitionOption })

  const definitionResponse = await axios(definitionOption)

  logger.debug({ message: req.path, definitionResponse: definitionResponse.data })

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
