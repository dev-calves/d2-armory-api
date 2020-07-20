const jwt = require('jsonwebtoken')

module.exports = function setTokenHeaders (req, res, next) {
  // set access header
  if (!req.headers['x-access-token'] && req.cookies['access-token']) {
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
  if (!req.headers['x-refresh-token'] && req.cookies['refresh-token']) {
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
