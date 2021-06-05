const qs = require('qs')
const axios = require('axios')
const axiosRetry = require('axios-retry')
const createError = require('http-errors')
const jwt = require('jsonwebtoken')
const logger = require('../../winston')

/**
 * options for requests to bungie for access/refresh tokens.
 * @returns options object
 */
const accessCookieOptions = () => {
  const expireDate = new Date()
  const now = expireDate.getMilliseconds()
  const expireTime = now + (45 * 60 * 1000) // 45 minutes in milliseconds
  expireDate.setMilliseconds(expireTime)

  return {
    domain: process.env.FRONT_END_DOMAIN,
    httpOnly: true,
    secure: (process.env.COOKIE_SECURE_FLAG === 'true'),
    // stores time in epoch, seconds
    expires: expireDate
  }
}

/**
 * options for requests to bungie to receive new access/refresh tokens from a given refresh token.
 * @returns options object
 */
const refreshCookieOptions = () => {
  const expireDate = new Date()
  const now = expireDate.getMilliseconds()
  const expireTime = now + (3 * 7 * 24 * 1 * 60 * 60 * 1000) // 3 weeks in milliseconds
  expireDate.setMilliseconds(expireTime)

  return {
    domain: process.env.FRONT_END_DOMAIN,
    httpOnly: true,
    secure: (process.env.COOKIE_SECURE_FLAG === 'true'),
    // stores time in epoch, seconds
    expires: expireDate
  }
}

/**
 * body for access/refresh token requests
 * @param {string} code given by bungie to acquire new tokens
 * @returns body for access-token requests for bungie.
 */
const tokensBody = (code) => { // used to acquire access and refresh tokens
  const body = {
    grant_type: process.env.OAUTH_ACCESS_GRANT_TYPE,
    client_id: process.env.BUNGIE_CLIENT_ID,
    code: code || '',
    client_secret: process.env.OAUTH_CLIENT_SECRET
  }

  return body
}

/**
 * body for token requests using a given refresh token.
 * @param {string} refresh token used to recieve new tokens from bungie.
 * @returns body for refresh-token requests for bungie.
 */
const refreshBody = (refresh) => { // used to acquire access token
  const body = {
    grant_type: process.env.OAUTH_REFRESH_GRANT_TYPE,
    client_id: process.env.BUNGIE_CLIENT_ID,
    refresh_token: refresh,
    client_secret: process.env.OAUTH_CLIENT_SECRET
  }

  return body
}

/**
 * encrypts tokens. jsonwebtoken defaults to HMAC SHA256
 * @param {string} token access or refresh token
 * @returns encrypted string
 */
const signCookies = (token) => {
  const signed = jwt.sign({
    token: token
  }, process.env.TOKEN_SECRET)

  return signed
}

/**
 * the option used for token requests. the data is qs.stringified to
 * satisfy the content-type in axios requests.
 * @param {string} code given by bungie to authorize token generation
 * @returns option object
 */
const tokensOption = (code) => {
  const option = {
    method: 'POST',
    baseURL: process.env.BUNGIE_DOMAIN,
    url: '/platform/app/oauth/token/',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: qs.stringify(tokensBody(code))
  }

  return option
}

/**
 * the option used for token requests with using a given refresh token.
 * the data is qs.stringified to satisfy the content-type in axios requests.
 * @param {string} refresh refresh token taken from a cookie.
 * @returns option object
 */
const refreshOption = (refresh) => {
  const option = {
    method: 'POST',
    baseURL: process.env.BUNGIE_DOMAIN,
    url: '/platform/app/oauth/token/',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: qs.stringify(refreshBody(refresh))
  }

  return option
}

/**
 * sets cookies into the server response to be stored by the client
 * @param {*} response bungie response
 * @param {*} req client request
 * @param {*} res server response
 */
const setTokenCookies = (response, req, res) => {
  if (response && response.access_token && response.refresh_token) {
    // set x-headers
    req.headers['x-access-token'] = response.access_token
    req.headers['x-refresh-token'] = response.refresh_token

    // set cookies
    res.cookie('access-token', signCookies(req.headers['x-access-token']), accessCookieOptions())
    res.cookie('refresh-token', signCookies(req.headers['x-refresh-token']), refreshCookieOptions())
  }
}

/**
 * sets bungie cookies to the server response
 * @param {*} axiosResponse general bungie response.
 * @param {*} res server response.
 */
const setCookies = (axiosResponse, res) => {
  if (axiosResponse.headers['set-cookie']) { // axios has cookie/s
    if (res.get('set-cookie')) { // res has cookie/s
      if (Array.isArray(axiosResponse.headers['set-cookie'])) { // axios has multiple cookies, array
        if (Array.isArray(res.get('set-cookie'))) { // res has multiple cookies, array
          axiosResponse.headers['set-cookie'].forEach(axiosCookie => {
            const axiosCookieKey = axiosCookie.substring(0, axiosCookie.indexOf('='))

            if (res.get('set-cookie').every(resCookie => (!resCookie.includes(axiosCookieKey)))) {
              res.append('set-cookie', axiosCookie)
            }
          })
        } else { // res has a cookie, string
          const resCookieKey = res.get('set-cookie').substring(0, res.get('set-cookie').indexOf('='))

          axiosResponse.headers['set-cookie'].forEach(axiosCookie => {
            if (!axiosCookie.includes(resCookieKey)) {
              res.append('set-cookie', axiosCookie)
            }
          })
        }
      } else { // axios has a cookie, string
        if (Array.isArray(res.get('set-cookie'))) { // res has multiple cookies, array
          const axiosCookieKey = axiosResponse.headers['set-cookie'].substring(0, axiosResponse.headers['set-cookie'].indexOf('='))

          if (res.get('set-cookie').every(resCookie => !resCookie.includes(axiosCookieKey))) {
            res.append('set-cookie', axiosResponse.headers['set-cookie'])
          }
        } else { // res has a cookie, string
          const axiosCookieKey = axiosResponse.headers['set-cookie'].substring(0, axiosResponse.headers['set-cookie'].indexOf('='))

          if (!res.get('set-cookie').includes(axiosCookieKey)) {
            res.append('set-cookie', axiosResponse.headers['set-cookie'])
          }
        }
      }
    } else { // res has no cookies, set new cookies directly.
      res.append('set-cookie', axiosResponse.headers['set-cookie'])
    }
  }
}

/**
 * sets the Authorization header using Bearer and a given access tokens.
 * refreshes tokens if the access token has expired.
 * creates a 401 error to be sent to the client if both tokens have expired.
 * @param {*} req client request
 * @param {*} res server response
 * @returns string
 */
const authorization = async (req, res) => {
  let authKey = ''

  if (req.headers['x-access-token']) {
    // if the access token is available, use it for the request.
    authKey = req.headers['x-access-token']
  } else if (req.headers['x-refresh-token']) {
    logger.debug({ message: `${req.path} - oauth-refresh`, refresh: req.headers['x-refresh-token'] })

    // request new tokens and set them as cookies for future requests.
    await request(refreshOption(req.headers['x-refresh-token']), req, res)

    authKey = req.headers['x-access-token']
  } else {
    // if the refresh token is available, throw a 401 error so that the 401-handler can refresh the token and retry the requests.
    throw (createError(401, 'Access token not available.'))
  }

  return `Bearer ${authKey}`
}

/**
 * deletes token headers and sets the cookies to be deleted by the client.
 * @param {*} req client request
 * @param {*} res server response
 */
const deleteTokens = (req, res) => {
  const pastDate = new Date()
  const pastTime = -(60 * 60 * 24 * 7 * 1000) // minus 1 week
  pastDate.setMilliseconds(pastTime)

  // set expiration date to the past.
  const accessExpiredCookieOptions = Object.assign({}, accessCookieOptions())
  accessExpiredCookieOptions.expires = pastDate
  const refreshExpiredCookieOptions = Object.assign({}, refreshCookieOptions())
  refreshExpiredCookieOptions.expires = pastDate

  // delete headers
  if (req.headers['x-access-token']) delete req.headers['x-access-token']
  if (req.headers['x-refresh-token']) delete req.headers['x-refresh-token']

  // delete cookies, the values must be cleared and must have matching options as the cookies set except for expires and maxAge.
  if (req.cookies['access-token'] || req.cookies['access-token'] === '') res.clearCookie('access-token', accessExpiredCookieOptions)
  if (req.cookies['refresh-token'] || req.cookies['refresh-token'] === '') res.clearCookie('refresh-token', refreshExpiredCookieOptions)
  // TODO: may need to clear member id from oauthResponse.
}

/**
 * requests used by server apis
 * @param {object} option option for the request
 * @param {*} req client request
 * @param {*} res server response
 * @returns response data taken from axios requests
 */
const request = async (option, req, res) => {
  logger.debug({ message: req.path, options: option })

  // added retries, specifically for transferItem requests
  // that occur before Bungie DBs have updated.
  // retries won't be logged with this method of retrying requests.
  axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay })

  /**
   * api requests will retry if the response is 401.
   * a request will be sent to refresh tokens.
   * the new tokens will be stored in the res cookies.
   */
  const axiosResponse = await axios(option).catch(async error => {
    if (error && error.response && error.response.status === 401) {
      if (req.headers['x-refresh-token']) {
        logger.debug({ message: `${req.path} - oauth-refresh`, refresh: req.headers['x-refresh-token'] })

        // request new tokens and set them as cookies for future requests.
        await request(refreshOption(req.headers['x-refresh-token']), req, res)

        // update authorization header in option
        option.headers.Authorization = authorization(req)

        // retry request with the token updated.
        const retriedResponse = await request(option, req, res)

        return retriedResponse
      } else {
        throw (error)
      }
    } else {
      throw (error)
    }
  })

  // update x-headers on req and set token cookies on res
  setTokenCookies(axiosResponse.data, req, res)

  // transfer cookies to res
  setCookies(axiosResponse, res)

  /**
   * log option and response data for debugging.
   */
  if (option && option.baseURL && option.baseURL.includes(process.env.SERVER_DOMAIN)) {
    // log api responses.
    const debuggerLog = { message: req.path }
    debuggerLog[`${req.path.substring(1)}-response`] = axiosResponse.data
    logger.debug(debuggerLog)
  } else if (option.baseURL.includes('bungie')) {
    // log bungie responses.
    logger.debug({ message: req.path, 'bungie-response': axiosResponse.data })
  } else {
    // log general response.
    logger.debug({ message: req.url, response: axiosResponse.data })
  }

  // return responseData
  return axiosResponse
}

module.exports = {
  request: request,
  authorization: authorization,
  deleteTokens: deleteTokens,
  tokensOption: tokensOption
}
