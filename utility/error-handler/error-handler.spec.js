/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const middlewareFunction = require('./error-handler')
const express = require('express')
const app = express()
const routeHandler = express.Router()
const createError = require('http-errors')

routeHandler.get('/test', (req, res, next) => {
  next(createError(500, 'boo boos were done'))
})

app.use('/', routeHandler)
app.use(middlewareFunction)

describe('error handler', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('should handle errors from a route', async (done) => {
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
      done()
    })

    app(request, response)
  })
})
