/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const routeHandler = require('./oauth')
jest.mock('../../utility/oauth/oauth')

describe('Oauth API', () => {
  describe('access route', () => {
    describe('successful response', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/oauth/access',
        headers: {
          code: '123'
        },
        get: (header) => `${this.headers.code}`
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      beforeEach(() => {
        jest.resetModules()
      })

      xtest('should respond with an ok status when the tokens are retrieved', async (done) => {
        response.on('end', function () {
          const routeResponse = response._getJSONData()
          expect(routeResponse).toBeDefined()
          expect(routeResponse).toEqual({ message: 'tokens recieved.' })
          done()
        })

        routeHandler(request, response)
      })
    })
  })

  describe('refresh route', () => {
    describe('true response', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/oauth/refresh',
        headers: {
          'x-refresh-token': 'refresh1234'
        }
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      beforeEach(() => {
        jest.resetModules()
      })

      xtest('should respond with a refresh status of true when the header exists', async (done) => {
        response.on('end', function () {
          const routeResponse = response._getJSONData()
          expect(routeResponse).toBeDefined()
          expect(routeResponse).toEqual({ 'refresh-token-available': true })
          done()
        })

        routeHandler(request, response)
      })
    })

    describe('false response', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/oauth/refresh',
        headers: {}
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      beforeEach(() => {
        jest.resetModules()
      })

      xtest('should respond with a refresh status of false when the header does not exist', async (done) => {
        response.on('end', function () {
          const routeResponse = response._getJSONData()
          expect(routeResponse).toBeDefined()
          expect(routeResponse).toEqual({ 'refresh-token-available': false })
          done()
        })

        routeHandler(request, response)
      })
    })
  })

  describe('delete route', () => {
    describe('successful response', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/oauth/delete'
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      beforeEach(() => {
        jest.resetModules()
      })

      xtest('should respond with an ok status when the tokens are deleted', async (done) => {
        response.on('end', function () {
          const routeResponse = response._getJSONData()
          expect(routeResponse).toBeDefined()
          expect(routeResponse).toEqual({ message: 'tokens deleted.' })
          done()
        })

        routeHandler(request, response)
      })
    })
  })
})
