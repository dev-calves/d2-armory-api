const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const utility = require('../../utility')

module.exports = router

/* POST equipments */
router.post('/dawn', [
  // validations
  utility.validations.body.equipment(true),
  utility.validations.body.membershipType,
  utility.validations.body.membershipId,
  utility.validations.body.characterId,
  utility.validations.body.transferLocation
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

  return dawnService(req, res, req.body.equipment, req.body.membershipType, req.body.membershipId, req.body.characterId, req.body.transferLocation, res)
    .then(dawnResponse => {
      logger.debug({ message: req.path, dawnResponse: dawnResponse })

      return res.status(200).json(dawnResponse)
    }).catch(error => {
      next(error)
      return
    })
})

async function dawnService (req, res, dawnEquipment, membershipType, membershipId, characterId, transferLocation) {
  // retrieve current equipment info.
  const captureResponse = await utility.requests.capture(req, res, membershipType, membershipId, characterId)

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
  const characterInventory = await utility.requests.characterInventory(req, res, membershipType, membershipId, characterId)

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

async function transferItemsService (req, res, captureResponse, filteredRequestEquipment, membershipType, characterId) {
  // filters out the subclass item and filters in items that were unequipped by the dawn request
  // the subclass item cannot be sent to the vault.
  const transferableEquipment = captureResponse.equipment.filter(captureItem =>
    captureItem.equipmentSlotHash !== utility.models.equipmentSlotTypes.SUBCLASS && filteredRequestEquipment.some(dawnItem =>
      captureItem.equipmentSlotHash === dawnItem.equipmentSlotHash))

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

    const transferResponse = await utility.oauth.request(transferItemsOption, req, res)

    return transferResponse.data
  }

  return { }
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
