const jsonata = require('jsonata')
const _ = require('lodash')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const utility = require('../../utility')
const bungiePlatformErrorCodes = require('../../utility/models/bungie-platform-error-codes')

module.exports = router

/* POST equipments */
router.post('/dawn', [
  // validations
  utility.validations.body.equipment(true, false, true),
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
  // used in conditionals for performance. Avoids async calls if Subclass is the only equipment needed to be dawned.
  const vaultableEquipmentSlots = ['Kinetic_Weapons', 'Energy_Weapons', 'Power_Weapons', 'Helmet', 'Gauntlets', 'Chest_Armor', 'Leg_Armor', 'Class_Armor']
  // response message from the dawn api
  const dawnResponse = {}

  // retrieve current equipment info.
  const captureResponse = await utility.requests.capture(req, res, membershipType, membershipId, characterId)
  const captureEquipment = captureResponse.equipment

  // filter out capture response items out of the dawn request.
  const filteredDawnEquipment = _.cloneDeep(dawnEquipment)

  for (const equipmentSlot in dawnEquipment) {
    if (captureEquipment[equipmentSlot].length === 1) { // it is possible to have no equipment on for a slot
      // validators check for atleast one element so we can guarantee element 0 exists for dawn equipment.
      const dawnItemHash = dawnEquipment[equipmentSlot][0].itemHash
      const dawnItemInstanceId = dawnEquipment[equipmentSlot][0].itemInstanceId
      const captureItemHash = captureEquipment[equipmentSlot][0].itemHash
      const captureItemInstanceId = captureEquipment[equipmentSlot][0].itemInstanceId

      // filter matching equipment based on itemHash and instanceId
      if (dawnItemHash === captureItemHash && dawnItemInstanceId === captureItemInstanceId) {
        delete filteredDawnEquipment[equipmentSlot]
      }
    }
  }

  /**
   * transfer items from the vault to the character's inventory
   */
  if (transferLocation === 'vault' && _.intersection(Object.keys(filteredDawnEquipment), vaultableEquipmentSlots).length > 0) {
    // check vault items for availability of items, then list the items needed to transfer.
    const vaultInventory = await utility.requests.vaultInventory(req, res, membershipType, membershipId)
    const vaultItems = vaultInventory.vault
    const vaultItemTransfers = []

    for (const filteredDawnEquipmentSlotType in filteredDawnEquipment) {
      for (const filteredDawnItem of filteredDawnEquipment[filteredDawnEquipmentSlotType]) {
        if (vaultItems.some(vaultItem => vaultItem.itemHash === filteredDawnItem.itemHash && vaultItem.itemId === filteredDawnItem.itemId)) {
          vaultItemTransfers.push(filteredDawnItem)
        }
      }
    }

    if (vaultItemTransfers.length > 0) {
      const vaultTransferResponse = await utility.requests.transferItems(req, res, false, membershipType, membershipId, characterId, vaultItemTransfers, null, vaultItems)
      dawnResponse.vaultToInventoryTransfers = vaultTransferResponse
    }
  }

  /**
   * equip all of the filtered dawn request equipment items from the character's inventory
   */
  if (Object.keys(filteredDawnEquipment).length > 0) {
    const equipItemIds = []

    for (const filteredDawnEquipmentSlotType in filteredDawnEquipment) {
      filteredDawnEquipment[filteredDawnEquipmentSlotType].forEach(filteredItem => {
        equipItemIds.push(filteredItem.itemId)
      })
    }

    if (equipItemIds.length > 0) {
      const equipmentResponse = await equipRequest(req, res, characterId, membershipType, equipItemIds)

      dawnResponse.equipment = transform(equipmentResponse, req).equipment

      dawnResponse.equipment.forEach(equip => {
        for (const equipmentSlotType in dawnEquipment) {
          const equipmentItem = dawnEquipment[equipmentSlotType].find(dawnItem => (equip.itemId === dawnItem.itemId))

          if (equipmentItem && equipmentItem.itemHash) {
            equip.itemHash = equipmentItem.itemHash
          }
        }
      })
    }
  }

  /**
   * transfer items from the character's inventory to the vault.
   */
  if (transferLocation === 'vault' && _.intersection(Object.keys(filteredDawnEquipment), vaultableEquipmentSlots).length > 0) {
    // assume character inventory instead of calling the service to improve response time.
    // Bungie's equip service will always unequip items to the character inventory.
    const characterEquipment = {}
    const itemTransfers = []

    for (const equipmentSlotType in filteredDawnEquipment) {
      if (equipmentSlotType !== 'Subclass') {
        characterEquipment[equipmentSlotType] = []
        characterEquipment[equipmentSlotType].push(captureResponse.equipment[equipmentSlotType][0])

        itemTransfers.push(captureResponse.equipment[equipmentSlotType][0])
      }
    }

    if (itemTransfers.length > 0) {
      const characterTransferResponse = await utility.requests.transferItems(req, res, true, membershipType, membershipId, characterId, itemTransfers, { equipment: characterEquipment }, null)
      dawnResponse.inventoryToVaultTransfers = characterTransferResponse
    }
  }

  // return response
  return dawnResponse
}

const equipRequest = async (req, res, characterId, membershipType, equipItemIds) => {
  const equipOption = {
    method: 'POST',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: '/Platform/Destiny2/Actions/Items/EquipItems/',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: await utility.oauth.authorization(req, res)
    },
    data: {
      itemIds: equipItemIds,
      characterId: characterId,
      membershipType: membershipType
    }
  }

  const bungieResponse = await utility.oauth.request(equipOption, req, res)

  return bungieResponse.data
}

function transform (bungieResponse, req) {
  const responseWithStatus = _.cloneDeep(bungieResponse)

  responseWithStatus.Response.equipResults.forEach(item => {
    item.equipStatus = bungiePlatformErrorCodes(item.equipStatus, req)
  })

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
  const response = expression.evaluate(responseWithStatus)

  // return
  return response
}
