const Secrets = require('../secrets')
const CryptoJS = require('crypto-js')
const express = require('express')
const router = express.Router()

/* POST encrypt */
router.post('/encrypt', (req, res) => {
  // Encrypt
  const b64 = CryptoJS.AES.encrypt(req.body.state, Secrets.encrypt).toString()
  const e64 = CryptoJS.enc.Base64.parse(b64).toString()

  // url safe.
  const eHex = e64.toString(CryptoJS.enc.Hex)

  // respond with hex value.
  return res.status(200).send({ hex: eHex, bungieClientId: process.env.BUNGIE_CLIENT_ID || '' })
})

/* POST decrypt */
router.post('/decrypt', (req, res) => {
  // parse hex from string.
  const reb64 = CryptoJS.enc.Hex.parse(req.body.hex)

  // base 64
  const bytes = reb64.toString(CryptoJS.enc.Base64)

  // decrypt.
  const decrypt = CryptoJS.AES.decrypt(bytes, Secrets.encrypt)

  // plain text.
  const plain = decrypt.toString(CryptoJS.enc.Utf8)

  // respond with plain text.
  return res.status(200).send({ state: plain })
})

module.exports = router
