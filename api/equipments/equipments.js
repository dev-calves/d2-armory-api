const express = require('express')

const router = express.Router()

const captureController = require('./capture')
const dawnController = require('./dawn')

router.use('/equipment', captureController, dawnController)

module.exports = router
