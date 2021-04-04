// const Secrets = require('../../secrets')
const CryptoJS = require('crypto-js')
const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const logger = require('../../winston')
const createError = require('http-errors')

/**
 * takes a state and encrypts a hex to return to the client to then be sent to bungie when authenticating.
 */
/* POST encrypt */
router.post('/encrypt', [
  body('state').notEmpty().withMessage('required parameter')
    .isIn(['inventory', 'vault']).withMessage('state only accepted with \'inventory\' or \'vault\'')
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

/**
 * take a hex and decrypts it back into the state the client was left in before authentication.
 * if the hex can be decrypted successfully, then the communication betwen the client and bungie hasn't been
 * tampered with.
 */
/* POST decrypt */
router.post('/decrypt', [
  body('hex').notEmpty().withMessage('required parameter')
    .isHexadecimal('hex').withMessage('hex property must be a hexidecimal value')
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
