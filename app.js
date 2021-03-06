if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

// references to dependencies.
if (process.env.NODE_ENV !== 'production') {
  var cors = require('cors')
}

const express = require('express')
const path = require('path')
const morgan = require('morgan')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

// utilities
const errorHandler = require('./utility/error-handler/error-handler')
const setTokenHeaders = require('./utility/token-headers/token-headers')

// references to apis.
const indexRouter = require('./routes/index')
const workerRouter = require('./routes/ngsw-worker')
const currentUserMembershipController = require('./api/current-user-membership/current-user-membership')
const charactersController = require('./api/characters/characters')
const encryptController = require('./api/encrypt/encrypt')
const oauthController = require('./api/oauth/oauth')
const equipmentsController = require('./api/equipments/equipments')
const definitionController = require('./api/definition/definition')
const transferItemController = require('./api/transfer-item/transfer-item')
const inventoryController = require('./api/inventory/inventory')

// create express app
const app = express()

// mount middleware dependencies.
app.use(morgan(process.env.MORGAN_SETTING))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(helmet())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: /http:\/\/(?:127\.0\.0\.1|localhost):(?:42|30)00/,
    credentials: true
  }))
}
app.use(setTokenHeaders)

// mount apis
app.use('/api',
  currentUserMembershipController,
  charactersController,
  encryptController,
  oauthController,
  equipmentsController,
  definitionController,
  transferItemController,
  inventoryController
)
app.get('/ngsw-worker.js', workerRouter) // provides a route for the angular service worker.
app.use('/*', indexRouter)

// error handler needs to be placed as the last middleware.
app.use(errorHandler)

module.exports = app
