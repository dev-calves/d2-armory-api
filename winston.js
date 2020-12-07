const { createLogger, format, transports } = require('winston')

const options = {
  format: format.combine(
    format.colorize(),
    format.simple()
  )
}

const logger = createLogger({
  level: process.env.WINSTON_LOG_LEVEL,
  handleExceptions: true,
  transports: [
    new transports.Console(options)
  ],
  exitOnError: false // do not exit on handled exceptions
})

module.exports = logger
