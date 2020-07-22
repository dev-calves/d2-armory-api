const logger = require('../../winston')
const OAuthUtility = require('../../utility/oauth/oauth')
const express = require('express')

const router = express.Router()

router.get('/oauth/access', (req, res, next) => {
  logger.info({ message: req.path, request: req.headers.code })

  // request to receive tokens.
  return OAuthUtility.oauthRequest(OAuthUtility.tokensBody(req.headers.code), req, res).then(response => {
    // send ok response
    const message = { message: 'tokens recieved.' }

    logger.info({ message: req.path, response: message })

    return res.status(200).json(message)
  }).catch(error => {
    next(error.response || error)
  })
})

router.get('/oauth/refresh', (req, res, next) => {
  let message

  if (req.headers['x-refresh-token']) {
    message = { 'refresh-token-available': true }
  } else {
    message = { 'refresh-token-available': false }
  }

  logger.info({ message: req.path, response: message })

  return res.status(200).json(message)
})

router.get('/oauth/delete', (req, res, next) => {
  // delete tokens.
  OAuthUtility.deleteTokens(req, res)

  // send ok response
  const message = { message: 'tokens deleted.' }

  logger.info({ message: req.path, response: message })

  return res.status(200).json(message)
})

module.exports = router
