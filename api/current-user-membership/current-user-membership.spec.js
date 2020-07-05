/* eslint-disable jest/no-test-callback */
const httpMocks = require('node-mocks-http')
const nock = require('nock')
let routeHandler
jest.mock('../../utility/oauth/oauth')

const bungieCurrentUserMembershipResponse = require('./mocks/bungie-current-user-membership-response.json')
const currentUserMembershipResponse = require('./mocks/current-user-membership-response.json')

describe('Current User Membership API', () => {
  const OLD_ENV = process.env

  describe('successful response', () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/current-user-membership'
    })
    const response = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    })

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...OLD_ENV }
      process.env.API_KEY = 'testKey'
      process.env.BUNGIE_DOMAIN = 'http://test.com'

      routeHandler = require('./current-user-membership')

      nock(process.env.BUNGIE_DOMAIN)
        .get('/Platform/User/GetMembershipsForCurrentUser/')
        .reply(200, bungieCurrentUserMembershipResponse)
    })

    afterEach(() => {
      process.env = OLD_ENV // restore old env
    })

    test('should respond with the current user\'s primary account info', async (done) => {
      response.on('end', function () {
        const routeResponse = response._getJSONData()
        expect(routeResponse).toBeTruthy()
        expect(routeResponse).toEqual(currentUserMembershipResponse)
        done()
      })

      routeHandler(request, response)
    })
  })
})
