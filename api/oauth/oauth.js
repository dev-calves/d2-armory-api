const logger = require('../../winston')
const utility = require('../../utility')
const express = require('express')

const router = express.Router()

/**
 * requests new tokens and stores them in cookies on the client.
 */
/* GET oauth/access */
router.get('/oauth/access', (req, res, next) => {
  logger.debug({ message: req.path, headers: req.headers, request: req.headers.code })

  // request to receive tokens.
  return utility.oauth.request(utility.oauth.tokensOption(req.headers.code), req, res).then(response => {
    // send ok response
    const message = { message: 'tokens recieved.' }

    logger.debug({ message: req.path, response: message })

    return res.status(200).json(message)
  }).catch(error => {
    next(error.response || error)
  })
})

/**
 * lets the client know if a refresh token is still good.
 */
/* GET /oauth/refresh-status */
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

/**
 * deletes token cookies to allow the client to log out of the user's account.
 */
/* GET /oauth/delete */
router.get('/oauth/delete', (req, res, next) => {
  // delete tokens.
  utility.oauth.deleteTokens(req, res)

  // send ok response
  const message = { message: 'tokens deleted.' }

  logger.debug({ message: req.path, response: message })

  return res.status(200).json(message)
})

module.exports = router
