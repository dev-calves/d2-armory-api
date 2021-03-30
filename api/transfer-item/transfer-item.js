const jsonata = require('jsonata')
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const _ = require('lodash')

const express = require('express')
const createError = require('http-errors')
const router = express.Router()

const utility = require('../../utility')

/* POST transfer-item */
router.post('/transfer-item', [
  // validations
  utility.validations.body.itemHash,
  utility.validations.body.membershipType,
  utility.validations.body.membershipId,
  utility.validations.body.characterId,
  utility.validations.body.itemId,
  body('transferToVault')
    .notEmpty().withMessage('required parameter')
    .isBoolean().withMessage('must be a boolean'),
  body('character')
    .optional()
    .isObject().withMessage('must be an object')
    .custom(value => ((value && value.equipment) || !value)).withMessage('equipment are required when character is provided.'),
  utility.validations.body.equipment(false, 'character.equipment'),
  utility.validations.body.vault(false)

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

  // transfers
  const transfers = [{ itemId: req.body.itemId, itemHash: req.body.itemHash }]

  transferSingleItemService(req, res, transfers).then(serviceResponse => {
    return res.status(200).json(serviceResponse)
  }).catch(error => {
    next(error)
    return
  })
})

/* POST transfer-items */
router.post('/transfer-items', [
  // validations
  utility.validations.body.membershipType,
  utility.validations.body.membershipId,
  utility.validations.body.characterId,
  body('transferToVault').notEmpty().withMessage('required parameter').isBoolean().withMessage('must be a boolean'),
  body('character')
    .optional()
    .isObject().withMessage('must be an object')
    .custom(value => ((value && value.equipment) || !value)).withMessage('equipment are required when character is provided.'),
  utility.validations.body.equipment(false, 'character.equipment'),
  utility.validations.body.vault(false),
  body('transferItems')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('transferItems.[*]')
    .notEmpty().withMessage('required parameter')
    .isObject().withMessage('must be an object'),
  body('transferItems.[*].itemHash')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be a string')
    .isNumeric().withMessage('must be numerical'),
  body('transferItems.[*].itemId')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be a string')
    .isNumeric().withMessage('must be numerical')
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

  const transfers = [...req.body.transferItems]

  transferMultipleItemService(req, res, transfers).then(serviceResponse => {
    res.status(200).json(serviceResponse)
    return
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

const transferSingleItemService = async (req, res, transfers) => {
  // check if items are available to be transfered.
  if (req.body.transferToVault) {
    await checkCharacterInventory(req, res, req.body.membershipType, req.body.membershipId, req.body.characterId, transfers, req.body.character)
  } else {
    await checkVaultInventory(req, res, req.body.membershipType, req.body.membershipId, transfers, req.body.vault)
  }

  // transfer the item if it is safe for transfer
  if (transfers[0].transferable) {
    const serviceResponses = await Promise.allSettled([transferItemRequest(req, res, req.body.membershipType, req.body.characterId, req.body.transferToVault, req.body.itemId, req.body.itemHash)])

    let transferResponse

    // set transferResponse
    if (serviceResponses[0].status === 'fulfilled') {
      transferResponse = serviceResponses[0].value
    } else if (serviceResponses[0].status === 'rejected') {
      // response is coming from a rejected axios response and so hasn't been transformed.
      const reqData = JSON.parse(serviceResponses[0].reason.config.data)

      transferResponse = transform(serviceResponses[0].reason.response.data)
      transferResponse.itemHash = reqData.itemReferenceHash
      transferResponse.itemId = reqData.itemId
    }

    return transferResponse
  } else {
    // respond with a failed message if the item is not safe to transfer
    return {
      transferStatus: `Transfer Failed - Item was not available in the ${(req.body.transferToVault) ? 'inventory' : 'vault'}.`,
      itemId: req.body.itemId,
      itemHash: req.body.itemHash
    }
  }
}

const transferMultipleItemService = async (req, res, transfers) => {
  // check if items are available to be transfered.
  if (req.body.transferToVault) {
    await checkCharacterInventory(req, res, req.body.membershipType, req.body.membershipId, req.body.characterId, transfers, req.body.character)
  } else {
    await checkVaultInventory(req, res, req.body.membershipType, req.body.membershipId, transfers, req.body.vault)
  }

  const transferServiceRequests = []
  const transferables = transfers.filter(item => item.transferable)
  const nonTransferables = transfers.filter(item => !item.transferable)

  // remove transferables prop.
  for (const transferItem of nonTransferables) {
    if (!transferItem.transferStatus) {
      transferItem.transferStatus = `Transfer Failed - Item was not available in the ${(req.body.transferToVault) ? 'inventory' : 'vault'}.`
    }
    delete transferItem.transferable
  }

  // call the transfer service for each transferable item.
  for (const transferItem of transferables) {
    delete transferItem.transferable
    transferServiceRequests.push(transferItemRequest(req, res, req.body.membershipType, req.body.characterId, req.body.transferToVault, transferItem.itemId, transferItem.itemHash))
  }

  const serviceResponses = await Promise.allSettled(transferServiceRequests)

  const successResponses = []

  // collect the successful/failed responses
  for (const result of serviceResponses) {
    let serviceItem

    if (result.status === 'fulfilled') {
      serviceItem = result.value
    } else if (result.status === 'rejected') {
      // response is coming from a rejected axios response and so hasn't been transformed.
      const reqData = JSON.parse(result.reason.config.data)

      serviceItem = transform(result.reason.response.data)
      serviceItem.itemHash = reqData.itemReferenceHash
      serviceItem.itemId = reqData.itemId
    }

    successResponses.push(serviceItem)
  }

  // combine non-transferables with the transferables before responding to client
  const transferResponses = successResponses.concat(nonTransferables)

  return transferResponses
}

async function transferItemRequest (req, res, membershipType, characterId, transferToVault, itemId, itemHash) {
  // request options
  const transferItemOption = {
    method: 'POST',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: '/Platform/Destiny2/Actions/Items/TransferItem',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: utility.oauth.authorization(req)
    },
    data: {
      itemReferenceHash: itemHash,
      itemId: itemId,
      transferToVault: transferToVault,
      characterId: characterId,
      membershipType: membershipType
    }
  }

  // itemnotfounds are returned as errors by bungie.
  const bungieResponse = await utility.oauth.request(transferItemOption, req, res)

  const clientResponse = transform(bungieResponse.data)
  clientResponse.itemId = itemId
  clientResponse.itemHash = itemHash

  return clientResponse
}

const checkCharacterInventory = async (req, res, membershipType, membershipId, characterId, transfers, character) => {
  let equipment

  // initialize equipment
  if (character) {
    equipment = _.cloneDeep(character.equipment)
  } else {
    const characterInventoryResponse = await utility.requests.characterInventory(req, res, membershipType, membershipId, characterId)
    equipment = characterInventoryResponse.character.equipment
  }

  // add transferable property to transfers, set to true if they are found in the inventory.
  for (const transferItem of transfers) {
    transferItem.transferable = false

    for (const equipmentSlot in equipment) {
      if (!transferItem.transferStatus && equipment[equipmentSlot].some(equipmentItem => transferItem.itemId === equipmentItem.itemId && transferItem.itemHash === equipmentItem.itemHash)) {
        transferItem.transferable = true
        break
      }
    }
  }
}

const checkVaultInventory = async (req, res, membershipType, membershipId, transfers, vaultItems) => {
  let vaultInventory

  // initialize items
  if (vaultItems) {
    vaultInventory = [...vaultItems]
  } else {
    const vaultInventoryResponse = await utility.requests.vaultInventory(req, res, membershipType, membershipId)
    vaultInventory = vaultInventoryResponse.vault
  }

  // add transferable property to transfers based on if they exist in the character inventory.
  for (const transferItem of transfers) {
    transferItem.transferable = false

    if (vaultInventory.some(vaultItem => transferItem.itemId === vaultItem.itemId && transferItem.itemHash === vaultItem.itemHash)) {
      transferItem.transferable = true
    }
  }
}

function transform (bungieResponse) {
  // expression for transforming the response
  const expression = jsonata('{ "transferStatus": **.ErrorStatus }')

  // response transformed
  const response = expression.evaluate(bungieResponse)

  return response
}
