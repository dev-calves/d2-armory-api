const logger = require('../../winston')
const oAuthUtility = require('../../utility/oauth/oauth')
const express = require('express')

const router = express.Router()

router.get('/oauth/access', (req, res, next) => {
  logger.debug({ message: req.path, headers: req.headers, request: req.headers.code })

  // request to receive tokens.
  return oAuthUtility.request(oAuthUtility.tokensOption(req.headers.code), req, res).then(response => {
    // send ok response
    const message = { message: 'tokens recieved.' }

    logger.debug({ message: req.path, response: message })

    return res.status(200).json(message)
  }).catch(error => {
    next(error.response || error)
  })
})

router.get('/oauth/refresh-status', (req, res, next) => {
  let message

  if (req.headers['x-refresh-token']) {
    message = { 'refresh-token-available': true }
  } else {
    message = { 'refresh-token-available': false }
  }

  logger.debug({ message: req.path, response: message })

  return res.status(200).json(message)
})

router.get('/oauth/delete', (req, res, next) => {
  // delete tokens.
  oAuthUtility.deleteTokens(req, res)

  // send ok response
  const message = { message: 'tokens deleted.' }

  logger.debug({ message: req.path, response: message })

  return res.status(200).json(message)
})

module.exports = router
