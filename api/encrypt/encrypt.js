// const Secrets = require('../../secrets')
const CryptoJS = require('crypto-js')
const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')

/* POST encrypt */
router.post('/encrypt', [
  body('state').notEmpty().withMessage('required parameter')
    .isIn(['inventory', 'vault']).withMessage('state only accepted with \'inventory\' or \'vault\'')
], (req, res) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  // Encrypt
  const b64 = CryptoJS.AES.encrypt(req.body.state, process.env.ENCRYPT_SECRET).toString()
  const e64 = CryptoJS.enc.Base64.parse(b64).toString()

  // url safe.
  const eHex = e64.toString(CryptoJS.enc.Hex)

  // respond with hex value.
  const message = { hex: eHex, bungieClientId: process.env.BUNGIE_CLIENT_ID }

  logger.debug({ message: req.path, response: message })

  return res.status(200).json(message)
})

/* POST decrypt */
router.post('/decrypt', [
  body('hex').notEmpty().withMessage('required parameter')
    .isHexadecimal('hex').withMessage('hex property must be a hexidecimal value')
], (req, res) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    return res.status(422).json(message)
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.body })

  // parse hex from string.
  const reb64 = CryptoJS.enc.Hex.parse(req.body.hex)

  // base 64
  const bytes = reb64.toString(CryptoJS.enc.Base64)

  // decrypt.
  const decrypt = CryptoJS.AES.decrypt(bytes, process.env.ENCRYPT_SECRET)

  // plain text.
  const plain = decrypt.toString(CryptoJS.enc.Utf8)

  // respond with plain text.
  const message = { state: plain }

  logger.debug({ message: req.path, response: message })

  return res.status(200).json(message)
})

module.exports = router
