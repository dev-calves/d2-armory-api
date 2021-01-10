const logger = require('../../winston')

module.exports = function errorHandler (error, req, res, next) {
  const message = {}

  if (error.status) {
    message.status = error.status
  } else if (error.statusCode) {
    message.status = error.statusCode
  } else if (error.response && error.response.status) {
    message.status = error.response.status
  } else if (error.response && error.response.statusCode) {
    message.status = error.response.statusCode
  } else {
    message.status = 500
  }

  // ignore non-error messages of refresh token requests that continue down the middleware chain
  if (message.status >= 400) {
    if (error.message && error.message.data) {
      message.message = error.message.data
    } else if (error.response && error.response.data) {
      message.message = error.response.data
    } else if (error.response) {
      message.message = error.response
    } else if (error.data) {
      message.message = error.data
    } else {
      message.message = error.message
      message.errors = error.errors || error
    }

    message.config = {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    }

    logger.error({ message: req.path, error: message })

    return res.status(message.status).json(message)
  } else {
    // this response will respond for the oauth handler's requests
    return res.status(message.status).json(message)
  }
}
