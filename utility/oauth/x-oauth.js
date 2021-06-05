const qs = require('qs')
const axios = require('axios')
const createError = require('http-errors')
const jwt = require('jsonwebtoken')
const logger = require('../../winston')

const accessCookieOptions = {
  domain: process.env.FRONT_END_DOMAIN,
  httpOnly: true,
  secure: (process.env.COOKIE_SECURE_FLAG === 'true')
}

const refreshCookieOptions = {
  domain: process.env.FRONT_END_DOMAIN,
  httpOnly: true,
  secure: (process.env.COOKIE_SECURE_FLAG === 'true')
}

module.exports = {

  async request (option, req, res, logLabel) {
    logger.debug({ message: req.path, options: option })

    const axiosResponse = await axios(option)

    if (option && option.baseURL && option.baseURL.includes(process.env.SERVER_DOMAIN)) {
      const debuggerLog = { message: req.path }
      debuggerLog[`${req.path.substring(1)}${logLabel || ''}-response`] = axiosResponse.data

      logger.debug(debuggerLog)

      // set logLabel to null to not retain the label during nested calls.
      logLabel = null
    } else if (option.baseURL.includes('bungie')) {
      logger.debug({ message: req.path, 'bungie-response': axiosResponse.data })
    } else {
      logger.debug({ message: req.url, response: axiosResponse.data })
    }

    this.setTokenCookies(axiosResponse, req, res)

    // if (equipmentsResponse && equipmentsResponse.headers && equipmentsResponse.headers['set-cookie'] &&
    //   equipmentsResponse.headers['set-cookie'].some(cookie => cookie.includes('access-token')) && equipmentsResponse.headers['set-cookie'].some(cookie => cookie.includes('refresh-token'))) {
    //   res.cookie('access-token', equipmentsResponse.headers['set-cookie'].find(cookie => cookie.includes('access-token')))
    //   res.cookie('refresh-token', equipmentsResponse.headers['set-cookie'].find(cookie => cookie.includes('refresh-token')))
    // }

    return axiosResponse.data
  },

  async oauthRequest (data, req, res) {
    const url = `${process.env.BUNGIE_DOMAIN}/platform/app/oauth/token/`
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    logger.debug({ message: `${req.path} - oauthRequest`, request: data })

    // POST request for the access token.
    // data is being stringified since axios doesn't support form requests for node.
    const oauthResponse = await axios.post(url, qs.stringify(data), config)

    logger.debug({ message: `${req.path} - oauthRequest`, response: oauthResponse.data })

    // set token cookies
    this.setTokenCookies(oauthResponse, req, res)
  },

  authorization (req) {
    let authKey = ''

    if (req.headers['x-access-token']) {
      // if the access token is available, use it for the request.
      authKey = req.headers['x-access-token']
    } else {
      // if the refresh token is available, throw a 401 error so that the 401-handler can refresh the token and retry the requests.
      throw (createError(401, 'Access token not available.'))
    }

    return `Bearer ${authKey}`
  },

  tokensBody (code) { // used to acquire access and refresh tokens
    const body = {
      grant_type: process.env.OAUTH_ACCESS_GRANT_TYPE,
      client_id: process.env.BUNGIE_CLIENT_ID,
      code: code || '',
      client_secret: process.env.OAUTH_CLIENT_SECRET
    }

    return body
  },

  refreshBody (refresh) { // used to acquire access token
    const body = {
      grant_type: process.env.OAUTH_REFRESH_GRANT_TYPE,
      client_id: process.env.BUNGIE_CLIENT_ID,
      refresh_token: refresh,
      client_secret: process.env.OAUTH_CLIENT_SECRET
    }

    return body
  },

  setTokenCookies (response, req, res) {
    // oauth retry bungie refresh requests have their tokens stored.
    if (response && response.data && response.data.access_token && response.data.refresh_token) {
      // set x-token-headers
      req.headers['x-access-token'] = response.data.access_token
      req.headers['x-refresh-token'] = response.data.refresh_token
      res.set({ 'x-access-token': response.data.access_token, 'x-refresh-token': response.data.refresh_token })

      // TODO: may need to store member id from oauthResponse.

    // nested requests that are retried with new oauth tokens will have their tokens stored into cookies.
    // the tokens are taken from axios responses.
    } else if (response && response.headers && response.headers['x-access-token'] && response.headers['x-refresh-token']) {
      res.cookie('access-token', this.signCookies(response.headers['x-access-token']), accessCookieOptions)
      res.cookie('refresh-token', this.signCookies(response.headers['x-refresh-token']), refreshCookieOptions)

    // single requests that are retried with a new oauth token will have their tokens stored into cookies.
    // the tokens are stored in express response headers.
    } else if (res && res.get('x-access-token') && res.get('x-refresh-token')) {
      // set cookies
      res.cookie('access-token', this.signCookies(res.get('x-access-token')), accessCookieOptions)
      res.cookie('refresh-token', this.signCookies(res.get('x-refresh-token')), refreshCookieOptions)
    } /* else if (req.headers['x-access-token'] && req.headers['x-refresh-token']) {
      res.set({ 'x-access-token': response.data.access_token, 'x-refresh-token': response.data.refresh_token })

      res.cookie('access-token', this.signCookies(res.get('x-access-token')), accessCookieOptions)
      res.cookie('refresh-token', this.signCookies(res.get('x-refresh-token')), refreshCookieOptions)
    } */
  },

  signCookies (token) {
    const signed = jwt.sign({
      token: token
    }, process.env.TOKEN_SECRET)

    return signed
  },

  deleteTokens (req, res) {
    // set expiration date to the past.
    const accessExpiredCookieOptions = Object.assign({}, accessCookieOptions)
    accessExpiredCookieOptions.expires = new Date(Date.now() - (60 * 60 * 24 * 7 * 1000)) // minus 1 week
    const refreshExpiredCookieOptions = Object.assign({}, refreshCookieOptions)
    refreshExpiredCookieOptions.expires = new Date(Date.now() - (60 * 60 * 24 * 7 * 1000)) // minus 1 week

    // delete headers
    if (req.headers['x-access-token']) delete req.headers['x-access-token']
    if (req.headers['x-refresh-token']) delete req.headers['x-refresh-token']

    // delete cookies, the values must be cleared and must have matching options as the cookies set except for expires and maxAge.
    if (req.cookies['access-token'] || req.cookies['access-token'] === '') res.clearCookie('access-token', accessExpiredCookieOptions)
    if (req.cookies['refresh-token'] || req.cookies['refresh-token'] === '') res.clearCookie('refresh-token', refreshExpiredCookieOptions)
    // TODO: may need to clear member id from oauthResponse.
  }
}
