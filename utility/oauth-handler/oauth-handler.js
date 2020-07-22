module.exports = function oauthHandler (error, req, res, next) {
  const OAuthUtility = require('../oauth/oauth')
  const axios = require('axios')
  const createError = require('http-errors')
  const logger = require('../../winston')

  // errors caused by HTTP 401 need a new access token
  if (error.status === 401 || error.statusCode === 401) {
    // request for a new token.
    if (req.headers['x-refresh-token']) {
      logger.info({ message: `${req.path} - oauth-handler`, refresh: req.headers['x-refresh-token'] })

      // request new tokens and set them as cookies for future requests.
      OAuthUtility.oauthRequest(
        OAuthUtility.refreshBody(req.headers['x-refresh-token']), req, res)
        .then(tokenResponse => {
        // take initial client request information
          const options = {
            baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
            url: req.path,
            method: req.method,
            headers: req.headers,
            params: req.params,
            data: req.body
          }

          logger.info({ message: `${req.path} - oauth-handler - retry`, options: options })

          // re-try client request with the tokens available.
          axios(options).then(response => {
            logger.info({ message: `${req.path} - oauth-handler - retry`, response: response.data })

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
