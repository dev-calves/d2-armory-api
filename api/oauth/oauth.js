const OAuthUtility = require('../../utility/oauth/oauth')
const express = require('express')

const router = express.Router()

router.get('/oauth/access', (req, res, next) => {
  // request to receive tokens.
  return OAuthUtility.oauthRequest(OAuthUtility.tokensBody(req.headers.code), res).then(response => {
    // send ok response
    return res.status(200).json({ message: 'tokens recieved.' })
  })
})

router.get('/oauth/refresh', (req, res, next) => {
  if (req.cookies['refresh-token']) {
    res.status(200).json({ 'refresh-token-available': true })
  } else {
    res.status(200).json({ 'refresh-token-available': false })
  }
})

router.get('/oauth/delete', (req, res, next) => {
  // delete tokens.
  OAuthUtility.deleteTokens(req, res)

  // send ok response
  return res.status(200).json({ message: 'tokens deleted.' })
})

module.exports = router
