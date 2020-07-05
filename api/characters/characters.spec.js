/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const nock = require('nock')
let routeHandler

const bungieCharactersResponse = require('./mocks/bungie-characters-response.json')
const charactersResponse = require('./mocks/characters-response.json')
const charactersBadResponse = require('./mocks/characters-bad-response.json')

describe('Characters API', () => {
  const OLD_ENV = process.env

  describe('successful response', () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/characters',
      query: {
        membershipId: '1',
        membershipType: '1'
      }
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...OLD_ENV }
      process.env.API_KEY = 'testKey'
      process.env.BUNGIE_DOMAIN = 'http://test.com'

      routeHandler = require('./characters')

      nock(process.env.BUNGIE_DOMAIN)
        .get('/Platform/Destiny2/1/Profile/1/?components=200')
        .reply(200, bungieCharactersResponse)
    })

    afterEach(() => {
      process.env = OLD_ENV // restore old env
    })

    test('should respond with the list of characters', async (done) => {
      response.on('end', function () {
        const routeResponse = response._getJSONData()
        expect(routeResponse).toBeTruthy()
        expect(routeResponse).toEqual(charactersResponse)
        done()
      })

      routeHandler(request, response)
    })
  })

  describe('bad response', () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/characters',
      query: {
        membershipType: '1'
      }
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...OLD_ENV }
      process.env.API_KEY = 'testKey'
      process.env.BUNGIE_DOMAIN = 'http://test.com'
    })

    afterEach(() => {
      process.env = OLD_ENV // restore old env
    })

    test('should respond with a bad response when parameters are missing', async (done) => {
      response.on('end', function () {
        const routeResponse = response._getJSONData()
        expect(routeResponse).toBeTruthy()
        expect(routeResponse).toEqual(charactersBadResponse)
        done()
      })

      routeHandler(request, response)
    })
  })
})
