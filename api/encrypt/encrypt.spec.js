/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
let controller

const decryptRequest = require('./mocks/decrypt-request.json')
const decryptResponse = require('./mocks/decrypt-response.json')
const decryptBadResponse = require('./mocks/decrypt-bad-response.json')
const encryptRequest = require('./mocks/encrypt-request.json')
const encryptBadRequest = require('./mocks/encrypt-bad-response.json')

jest.mock('../../secrets')

describe('Encrypt API', () => {
  const OLD_ENV = process.env

  describe('encrypt route', () => {
    describe('successful response', () => {
      beforeEach(() => {
        jest.resetModules()
        process.env = { ...OLD_ENV }
        process.env.BUNGIE_CLIENT_ID = '12345'

        controller = require('./encrypt')
      })

      afterEach(() => {
        process.env = OLD_ENV // restore old env
      })

      test('should respond with the state hex and client id', async (done) => {
        const request = httpMocks.createRequest({
          method: 'POST',
          url: '/encrypt',
          body: encryptRequest
        })
        const response = httpMocks.createResponse({
          eventEmitter: require('events').EventEmitter
        })

        response.on('end', function () {
          const controllerResponse = response._getJSONData()
          expect(controllerResponse).toBeDefined()
          expect(controllerResponse.hex).toBeDefined()
          expect(controllerResponse.bungieClientId).toBeDefined()
          expect(controllerResponse.hex).toMatch(/[0-9a-fA-F]+/) // hex regex
          expect(controllerResponse.bungieClientId).toMatch(/[0-9]+/) // number
          done()
        })

        controller(request, response)
      })
    })

    describe('bad response', () => {
      beforeEach(() => {
        jest.resetModules()
        process.env = { ...OLD_ENV }
        process.env.BUNGIE_CLIENT_ID = '12345'

        controller = require('./encrypt')
      })

      afterEach(() => {
        process.env = OLD_ENV // restore old env
      })

      test('should respond with a bad response when the state is missing', async (done) => {
        const request = httpMocks.createRequest({
          method: 'POST',
          url: '/encrypt',
          body: {}
        })
        const response = httpMocks.createResponse({
          eventEmitter: require('events').EventEmitter
        })

        response.on('end', function () {
          const controllerResponse = response._getJSONData()
          expect(controllerResponse).toBeDefined()
          expect(controllerResponse).toEqual(encryptBadRequest)
          done()
        })

        controller(request, response)
      })
    })
  })

  describe('decrypt route', () => {
    describe('successful response', () => {
      beforeEach(() => {
        jest.resetModules()

        controller = require('./encrypt')
      })

      test('should respond with the state decrypted from hex', async (done) => {
        const request = httpMocks.createRequest({
          method: 'POST',
          url: '/decrypt',
          body: decryptRequest
        })
        const response = httpMocks.createResponse({
          eventEmitter: require('events').EventEmitter
        })

        response.on('end', function () {
          const controllerResponse = response._getJSONData()
          expect(controllerResponse).toBeDefined()
          expect(controllerResponse).toEqual(decryptResponse)
          done()
        })

        controller(request, response)
      })
    })

    describe('bad response', () => {
      beforeEach(() => {
        jest.resetModules()

        controller = require('./encrypt')
      })

      test('should respond with a bad response when the hex is missing', async (done) => {
        const request = httpMocks.createRequest({
          method: 'POST',
          url: '/decrypt',
          body: {}
        })
        const response = httpMocks.createResponse({
          eventEmitter: require('events').EventEmitter
        })

        response.on('end', function () {
          const controllerResponse = response._getJSONData()
          expect(controllerResponse).toBeDefined()
          expect(controllerResponse).toEqual(decryptBadResponse)
          done()
        })

        controller(request, response)
      })
    })
  })
})
