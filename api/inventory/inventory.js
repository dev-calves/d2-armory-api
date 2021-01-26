const express = require('express')

const router = express.Router()

const vaultController = require('./vault')
const characterController = require('./character')

router.use('/inventory', vaultController, characterController)

module.exports = router
