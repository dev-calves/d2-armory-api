/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const middlewareFunction = require('./token-headers')
const express = require('express')
const app = express()
const routeHandler = express.Router()
jest.mock('jsonwebtoken')

routeHandler.get('/test', (req, res) => {
  if (req.headers['x-access-token'] === '' && req.headers['x-refresh-token'] === '') {
    return res.status(200).json({ message: 'hi' })
  } else {
    return res.status(500).json({ error: 'bad thing happened.' })
  }
})

app.use(middlewareFunction)
app.use('/', routeHandler)

describe('token headers', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    process.env.TOKEN_SECRET = 'test'
  })

  afterEach(() => {
    process.env = OLD_ENV // restore old env
  })

  // the jwt dependency in the middleware is not being mocked.
  test.skip('should have x-headers placed in the request, taken from cookies', async (done) => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/test',
      cookies: {
        'access-token': 'testaccess',
        'refresh-token': 'testrefresh'
      }
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    response.on('end', function () {
      const routeResponse = response._getJSONData()
      expect(routeResponse).toEqual({ message: 'hi' })
      done()
    })

    app(request, response)
  })

  test('should not have x-headers placed into the request without cookies', async (done) => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/test'
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    response.on('end', function () {
      const routeResponse = response._getJSONData()
      expect(routeResponse).toEqual({ error: 'bad thing happened.' })
      done()
    })

    app(request, response)
  })
})
