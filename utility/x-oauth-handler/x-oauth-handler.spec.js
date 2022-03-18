/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const nock = require('nock')
let middlewareFunction
const express = require('express')
const app = express()
const routeHandler = express.Router()
const createError = require('http-errors')
jest.mock('../oauth/oauth')

describe('oauth handler', () => {
  let routeStatus = 500

  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()

    jest.resetModules()
    process.env = { ...OLD_ENV }

    process.env.SERVER_DOMAIN = 'test.com'

    middlewareFunction = require('./x-oauth-handler')

    routeHandler.get('/test', (req, res, next) => {
      next(createError(routeStatus, 'boo boos were done'), req, res)
      return
    })

    app.use('/', routeHandler)
    app.use(middlewareFunction)
    app.use((error, res, req, next) => {
      // the initial res object doesn't have access to the status function.
      // the nested res does have a status function but it returns 200.
      // so the nested res is used for the function but overwritten with the
      // error status.
      return res.res.status(error.status).json({ message: error.message })
    })
  })

  afterEach(() => {
    process.env = OLD_ENV // restore old env

    routeStatus = 500

    nock.cleanAll()
  })

  xtest('should send non 401 errors to an error-handler', async () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/test'
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    response.on('end', function () {
      const routeResponse = response._getJSONData()
      expect(response._getStatusCode()).toBe(500)
      expect(routeResponse.message).toEqual('boo boos were done')
    })

    app(request, response)
  })

  describe('401 errors', () => {
    beforeEach(() => {
      routeStatus = 401
    })

    xtest('should send 401 errors to an error-handler when no tokens are available', async () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/test'
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      response.on('end', function () {
        const routeResponse = response._getJSONData()
        expect(response._getStatusCode()).toBe(401)
        expect(routeResponse.message).toContain('User must be logged in to use this service.')
      })

      app(request, response)
    })

    xtest('should refresh tokens when the refresh header is available', async () => {
      jest.setTimeout(15000) // this test needs more time to evaluate because of the multiple async events.

      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/test',
        headers: {
          'x-refresh-token': 'refresh1234'
        },
        protocol: 'http'
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      nock(`http://${process.env.SERVER_DOMAIN}`)
        .get('/test')
        .reply(200, { tokens: '123' })

      response.on('end', function () {
        const routeResponse = response._getJSONData()
        expect(response._getStatusCode()).toBe(200)
        expect(routeResponse).toEqual({ tokens: '123' })
      })

      app(request, response)
    })
  })
})
