const axios = require('axios')
const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

// const oAuthUtility = require('../../utility/oauth/oauth')
// const ErrorCodesEnum = require('../../utility/models/bungie-platform-error-codes')
const slotTypes = require('../../utility/models/equipment-slot-types')
const validations = require('../../utility/validations/body')

/* POST equipments */
router.post('/dawn', [
  // validations
  validations.equipment,
  validations.membershipType,
  validations.membershipId,
  validations.characterId,
  validations.transferLocation
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

  /* TODO: remove res from this function call. It is just here for testing oauth refresh. */
  return dawnService(req, req.body.equipment, req.body.membershipType, req.body.membershipId, req.body.characterId, req.body.transferLocation, res)
    .then(dawnResponse => {
      logger.debug({ message: req.path, dawnResponse: dawnResponse })

      return res.status(200).json(dawnResponse)
    }).catch(error => {
      next(error)
      return
    })
})

module.exports = router

/* TODO: remove res, just here for testing */
async function dawnService (req, dawnEquipment, membershipType, membershipId, characterId, transferLocation, res) {
  // retrieve current equipment info.
  const captureResponse = await captureService(req, membershipType, membershipId, characterId)

  // filter out capture response items out of the dawn request.
  const filteredDawnEquipment = Object.assign({}, dawnEquipment)

  for (const equipmentSlot in dawnEquipment) {
    if (captureResponse.equipment[equipmentSlot].length === 1) { // it is possible to have no equipment on for a slot
      // validators check for atleast one element so we can guarantee element 0 exists for dawn equipment.
      const dawnItemHash = dawnEquipment[equipmentSlot][0].itemHash
      const dawnItemInstanceId = dawnEquipment[equipmentSlot][0].itemInstanceId
      const captureItemHash = captureResponse.equipment[equipmentSlot][0].itemHash
      const captureItemInstanceId = captureResponse.equipment[equipmentSlot][0].itemInstanceId

      // filter matching equipment based on itemHash and instanceId
      if (dawnItemHash === captureItemHash && dawnItemInstanceId === captureItemInstanceId) {
        delete filteredDawnEquipment[equipmentSlot]
      }
    }
  }

  // check the character's inventory to see if they are carrying the dawn request equipment.
  const characterInventory = await characterInventoryService(req, membershipType, membershipId, characterId)

  const stowedDawnEquipment = {}
  const vaultEquipment = {}

  for (const equipmentSlot in filteredDawnEquipment) {
    if (filteredDawnEquipment[equipmentSlot] && filteredDawnEquipment[equipmentSlot].length === 1) {
      const filteredDawnItemHash = filteredDawnEquipment[equipmentSlot][0].itemHash
      const filteredDawnItemInstanceId = filteredDawnEquipment[equipmentSlot][0].itemInstanceId

      if (characterInventory && characterInventory.character && characterInventory.character.equipment && characterInventory.character.equipment[equipmentSlot]) {
        const characterEquipmentSlotItems = characterInventory.character.equipment[equipmentSlot]

        // find the equipment in the character's inventory.
        if (characterEquipmentSlotItems.some(equipment =>
          (equipment.itemHash === filteredDawnItemHash && equipment.itemInstanceId === filteredDawnItemInstanceId))) {
          // add an equipment slot when the item is found.
          stowedDawnEquipment[equipmentSlot] = []

          stowedDawnEquipment[equipmentSlot].push(characterEquipmentSlotItems.find(equipment =>
            (equipment.itemHash === filteredDawnItemHash && equipment.itemInstanceId === filteredDawnItemInstanceId)))
        } else {
          // add an equipment slot when the item is not found in the character's slot.
          vaultEquipment[equipmentSlot] = []

          // if the equipment isn't in the character's inventory then list the items to be checked in the vault.
          vaultEquipment[equipmentSlot].push(filteredDawnEquipment[equipmentSlot][0])
        }
      } else {
        // add an equipment slot when the item is not found in the character's slot.
        vaultEquipment[equipmentSlot] = []

        // if the equipment isn't in the character's inventory then list the items to be checked in the vault.
        vaultEquipment[equipmentSlot].push(filteredDawnEquipment[equipmentSlot][0])
      }
    }
  }

  if (transferLocation === 'vault') {
    // TODO: if vaultEquipment has entries, then make a request to retrieve vault items for the profile.

    // const vaultEquipment = await vaultService(req, membershipType, membershipId)

    // const vaultEquipment = (await vaultService(req, membershipType, membershipId)).vault.equipment
    // const vaultTransferrables = []

    // return {}// vaultEquipment //{}

    // dawnEquipment.forEach(dawnEquip => {
    //   if (true) {

    //   }
    // })
  } else {
    // TODO: transfer equipment to the character's inventory.
  }

  return stowedDawnEquipment// {}
}

async function characterInventoryService (req, membershipType, membershipId, characterId) {
  // request options
  const characterOption = {
    method: 'GET',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/inventory/character?membershipType=${membershipType}&membershipId=${membershipId}&characterId=${characterId}`,
    headers: {
      'x-access-token': req.headers['x-access-token'],
      'x-refresh-token': req.headers['x-refresh-token']
    }
  }

  const characterResponse = await request(characterOption, req)

  return characterResponse
}

async function vaultService (req, membershipType, membershipId) {
  // request options
  const vaultOption = {
    method: 'GET',
    url: `${req.protocol}://${process.env.SERVER_DOMAIN}/api/inventory/vault?membershipType=${membershipType}&membershipId=${membershipId}`,
    headers: {
      'x-access-token': req.headers['x-access-token'],
      'x-refresh-token': req.headers['x-refresh-token']
    }
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
            "itemId": $string(itemInstanceId),
            "equipStatus": equipStatus
        }
    ]
  }`)

  // response transformed
  const response = expression.evaluate(bungieResponse)

  // return
  return response
}
