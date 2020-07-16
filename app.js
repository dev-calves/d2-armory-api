if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

// references to dependencies.
const express = require('express')
const path = require('path')
const logger = require('morgan')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

// utilities
const errorHandler = require('./utility/error-handler/error-handler')

// references to apis.
const indexRouter = require('./routes/index')
const currentUserMembershipController = require('./api/current-user-membership/current-user-membership')
const charactersController = require('./api/characters/characters')
const encryptController = require('./api/encrypt/encrypt')
const oauthController = require('./api/oauth/oauth')

// create express app
const app = express()

// mount middleware dependencies.
app.use(logger(process.env.MORGAN_SETTING))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(helmet())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())

// mount apis
app.use('/api',
  currentUserMembershipController,
  charactersController,
  encryptController,
  oauthController
)
app.use('/*', indexRouter)

// error handler needs to be placed as the last middleware.
app.use(errorHandler)

module.exports = app
