module.exports = function oauthHandler (error, req, res, next) {
  const OAuthUtility = require('../oauth/oauth')
  const axios = require('axios')
  const createError = require('http-errors')

  // errors caused by HTTP 401 need a new access token
  if (error.status === 401 || error.statusCode === 401) {
    // request for a new token.
    if (req.headers['x-refresh-token']) {
      // request new tokens and set them as cookies for future requests.
      OAuthUtility.oauthRequest(
        OAuthUtility.refreshBody(req.headers['x-refresh-token']), req, res)
        .then(tokenResponse => {
        // take initial client request information
          const baseURL = `${req.protocol}://${process.env.SERVER_DOMAIN}`
          const url = req.path
          const method = req.method
          const headers = req.headers
          const params = req.params
          const data = req.body

          // re-try client request with the tokens available.
          axios({
            baseURL: baseURL,
            url: url,
            method: method,
            headers: headers,
            params: params,
            data: data
          }).then(response => {
            res.status(200).json(response.data)
            return // prevent further execution of code.
          }).catch(error => {
            next(error)
            return // prevent further execution of code.
          })
        }).catch(error => {
        // log user out if refresh request returns unauthorized
          if (error.status === 401 || error.statusCode === 401) {
          // log user out
            OAuthUtility.deleteTokens(req, res)
          }

          // move error to the error-handler
          next(error)
          return // prevent further execution of code.
        })
    } else {
      // when both access and refresh tokens are not available, respond to the client with a 401
      return next(createError(401, 'User must be logged in to use this service.'))
    }
  } else {
    // move non 401 errors to the error-handler
    next(error)
    return
  }
}
