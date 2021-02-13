const axios = require('axios')
const jsonata = require('jsonata')
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const oAuthUtility = require('../../utility/oauth/oauth')
const ErrorCodesEnum = require('../../utility/models/bungie-platform-error-codes')
const slotTypes = require('../../utility/models/equipment-slot-types')

/* POST equipments */
router.post('/dawn', [
  // validations
  body('equipment').notEmpty().withMessage('required parameter')
    .isArray()
    .withMessage('must be an array of string'),
  body('equipment[*].itemId')
    .isString()
    .withMessage('must be in the form of a string')
    .isInt().withMessage('must be an integer'),
  body('equipment[*].equipmentSlotHash')
    .isString()
    .withMessage('must be in the form of a string')
    .isInt()
    .withMessage('must be an integer'),
  body('membershipType')
    .notEmpty()
    .withMessage('required parameter')
    .isInt()
    .withMessage('must be an integer'),
  body('membershipId')
    .notEmpty()
    .withMessage('required parameter')
    .isInt()
    .withMessage('must be an integer'),
  body('characterId')
    .notEmpty()
    .withMessage('required parameter')
    .isInt()
    .withMessage('must be an integer'),
  body('transferLocation').optional()
    .isIn(['inventory', 'vault'])
    .withMessage('optional parameter. If declared, must be either \'vault\', \'inventory\'')
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

  return dawnService(req, req.body.equipment, req.body.membershipType, req.body.membershipId, req.body.characterId, req.body.transferLocation)
    .then(dawnResponse => {
      logger.debug({ message: req.path, dawnResponse: dawnResponse })

      return res.status(200).json(dawnResponse)
    }).catch(error => {
      next(error)
      return
    })
})

module.exports = router

async function dawnService (req, dawnEquipment, membershipType, membershipId, characterId, transferLocation) {
  // retrieve current equipment info.
  const captureResponse = await captureService(req, membershipType, membershipId, characterId)

  // filter out capture response items out of the dawn request.
  const filteredRequestEquipment = dawnEquipment.filter(dawnEquipmentItem =>
    !captureResponse.equipment.find(captureEquipmentItem =>
      dawnEquipmentItem.itemId === captureEquipmentItem.itemId))

  if (transferLocation === 'vault') {
    const vaultEquipment = (await vaultService(req, membershipType, membershipId)).vault.equipment
    const vaultTransferrables = []

    return {}// vaultEquipment

    // dawnEquipment.forEach(dawnEquip => {
    //   if (true) {

    //   }
    // })
  }

  // TODO: if the boolean property for allowing equipping from the vault is true
  // TODO: make a request to check the inventory of the character.

  // list the itemIds from each equipment in the body
  // const itemIds = []
  // if (filteredRequestEquipment.length > 0) {
  //   filteredRequestEquipment.forEach(item => { itemIds.push(item.itemId) })
  // }

  // const itemIds = filteredRequestEquipment.map(item => item.itemId)

  const clientResponse = {}
  // let bungieResponse
  // let dawnResponse = {}

  // if (itemIds.length > 0) {
  //   // request options
  //   const equipmentsOption = {
  //     method: 'POST',
  //     url: `${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/Actions/Items/EquipItems`,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'X-API-Key': process.env.API_KEY,
  //       Authorization: oAuthUtility.authorization(req)
  //     },
  //     data: {
  //       itemIds: itemIds,
  //       transferLocation: transferLocation,
  //       membershipType: membershipType,
  //       membershipId: membershipId,
  //       characterId: characterId
  //     }
  //   }

  // bungieResponse = await request(equipmentsOption, req)

  // dawnResponse = transform(bungieResponse)

  // replace bungie's integer error code with a message, taken from bungie's platform site.
  // dawnResponse.equipment.forEach(item => {
  //   item.equipStatus = ErrorCodesEnum(item.equipStatus, req)
  // })

  // clientResponse.equipmentDawned = dawnResponse
  // }

  // if transferLocation is set to 'vault', transfer unequipped items to the vault
  // if (clientResponse.equipmentDawned && transferLocation === 'vault') {
  //   const transferResponse = await transferItemsService(req, captureResponse, filteredRequestEquipment, membershipType, characterId)

  //   clientResponse.transferredItems = transferResponse
  // }

  // response
  return clientResponse
}

async function vaultService (req, membershipType, membershipId) {
  // request options
  const vaultOption = {
    method: 'GET',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/inventory/vault?membershipType=${membershipType}&membershipId=${membershipId}`
  }

  const vaultResponse = await request(vaultOption, req)

  return vaultResponse
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

async function transferItemsService (req, captureResponse, filteredRequestEquipment, membershipType, characterId) {
  // filters out the subclass item and filters in items that were unequipped by the dawn request
  // the subclass item cannot be sent to the vault.
  const transferableEquipment = captureResponse.equipment.filter(captureItem =>
    captureItem.equipmentSlotHash !== slotTypes.SUBCLASS && filteredRequestEquipment.some(dawnItem =>
      captureItem.equipmentSlotHash === dawnItem.equipmentSlotHash))

  let transferResponse = {

  }

  if (transferableEquipment.length > 0) {
    // request options
    const transferItemsOption = {
      method: 'POST',
      url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/transfer-items`,
      headers: req.headers,
      data: {
        transferToVault: true,
        equipment: transferableEquipment,
        characterId: characterId,
        membershipType: membershipType
      }
    }

    transferResponse = await request(transferItemsOption, req)
  }

  return transferResponse
}

async function request (equipmentOption, req) {
  logger.debug({ message: req.path, options: equipmentOption })

  const equipmentsResponse = await axios(equipmentOption)

  if (equipmentOption.url.includes(process.env.SERVER_DOMAIN)) {
    if (equipmentOption.url.includes('/transfer-items')) {
      logger.debug({ message: req.path, transferItemsResponse: equipmentsResponse.data })
    } else if (equipmentOption.url.includes('/capture')) {
      logger.debug({ message: req.path, captureResponse: equipmentsResponse.data })
    }
  } else {
    logger.debug({ message: req.path, bungieResponse: equipmentsResponse.data })
  }

  return equipmentsResponse.data
}

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata(`
  {
    "equipment": [Response.equipResults.
        {
            "itemId": itemInstanceId,
            "equipStatus": equipStatus
        }
    ]
  }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
