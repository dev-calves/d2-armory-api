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
    } else if (error.message) {
      message.message = error.message
    } else if (error.response && error.response.status) {
      message.message = error.response.status
    } else if (error.response) {
      message.message = error.response
    } else if (error.data) {
      message.message = error.data
    } else {
      message.message = error
    }

    console.log(`${req.url} - error: `, message)

    return res.status(message.status).json(message)
  } else {
    // this response will respond to the oauth handler's request
    return res.status(message.status).json(message)
  }
}
