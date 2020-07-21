const OAuthUtility = require('../../utility/oauth/oauth')
const express = require('express')

const router = express.Router()

router.get('/oauth/access', (req, res, next) => {
  console.info('/oauth/access - request: ', 'code: ', req.headers.code)

  // request to receive tokens.
  return OAuthUtility.oauthRequest(OAuthUtility.tokensBody(req.headers.code), req, res).then(response => {
    // send ok response
    const message = { message: 'tokens recieved.' }

    console.info('/oauth/access - response: ', message)

    res.shouldKeepAlive = false // prevent duplicate requests with stale 'code'

    return res.status(200).json(message)
  }).catch(error => {
    next(error.response)
  })
})

router.get('/oauth/refresh', (req, res, next) => {
  if (req.headers['x-refresh-token']) {
    const message = { 'refresh-token-available': true }
    console.info('/oauth/refresh - response: ', message)

    return res.status(200).json(message)
  } else {
    const message = { 'refresh-token-available': false }
    console.info('/oauth/refresh - response: ', message)

    return res.status(200).json(message)
  }
})

router.get('/oauth/delete', (req, res, next) => {
  // delete tokens.
  OAuthUtility.deleteTokens(req, res)

  // send ok response
  const message = { message: 'tokens deleted.' }

  console.info('/oauth/delete - response: ', message)

  return res.status(200).json(message)
})

module.exports = router
