if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

// references to dependencies.
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const logger = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')

// utilities
const errorHandler = require('./utility/error-handler/error-handler')
const oauthHandler = require('./utility/oauth-handler/oauth-handler')
const setTokenHeaders = require('./utility/token-headers/token-headers')

// references to apis.
const indexRouter = require('./routes/index')
const currentUserMembershipController = require('./api/current-user-membership/current-user-membership')
const charactersController = require('./api/characters/characters')
const encryptController = require('./api/encrypt/encrypt')
const oauthController = require('./api/oauth/oauth')

// create express app
const app = express()

// cors configuration.
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '',
  credentials: true, // added to allows storing cookies to the client
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// mount middleware dependencies.
app.use(logger(process.env.MORGAN_SETTING))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors(corsOptions))
app.use(helmet())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())
app.use(setTokenHeaders)

// set view location and renderer for the home page.
app.set('views', path.join(__dirname, './views'))
app.set('view engine', 'pug')

// mount home route
app.use('/', indexRouter)

// mount apis
app.use('/api',
  currentUserMembershipController,
  charactersController,
  encryptController,
  oauthController
)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// handles requests with missing tokens.
app.use(oauthHandler)

// error handler needs to be placed as the last middleware.
app.use(errorHandler)

module.exports = app
