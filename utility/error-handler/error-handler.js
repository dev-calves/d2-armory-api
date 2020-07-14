module.exports = function errorHandler (error, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = error.message
  res.locals.error = req.app.get('env') === 'production' ? error : {}

  return res.status(error.status ||
        error.statusCode ||
        ((error.response && error.response.status) ? error.response.status : false) ||
        ((error.response && error.response.statusCode) ? error.response.statusCode : false) || 500)
    .json({
      message: error.message,
      error: (error.response && error.response.data) ? error.response.data : error
    })
}
