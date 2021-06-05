const express = require('express')

const inventoryItemController = require('./inventory-item')
const equipmentSlotController = require('./equipment-slot')

const router = express.Router()

router.use('/definition', inventoryItemController, equipmentSlotController)

module.exports = router
