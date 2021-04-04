const jwt = require('jsonwebtoken')

/**
 * middleware for taking tokens from cookies and storing them in x-headers to be
 * used throughout the server.
 * @param {*} req client request
 * @param {*} res server response
 * @param {*} next moves request to the next middlware function
 * @returns undefined
 */
module.exports = function setTokenHeaders (req, res, next) {
  // set access header
  if (!req.headers['x-access-token'] && req.cookies['access-token']) { // req.cookies will be empty when axios makes requests.
    let accessToken = ''
    try {
      accessToken = jwt.verify(req.cookies['access-token'], process.env.TOKEN_SECRET).token
    } catch (error) {
      // leave accessToken with an empty string
    }
    if (accessToken) {
      req.headers['x-access-token'] = accessToken
    }
  }

  // set refresh header
  if (!req.headers['x-refresh-token'] && req.cookies['refresh-token']) { // req.cookies will be empty when axios makes requests.
    let refreshToken = ''
    try {
      refreshToken = jwt.verify(req.cookies['refresh-token'], process.env.TOKEN_SECRET).token
    } catch (error) {
      // leave refreshToken with an empty string
    }
    if (refreshToken) {
      req.headers['x-refresh-token'] = refreshToken
    }
  }

  next()
  return
}
