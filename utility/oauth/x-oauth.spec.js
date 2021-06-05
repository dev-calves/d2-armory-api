/* eslint-disable jest/no-jasmine-globals */
/* eslint-disable jest/no-test-callback */
const nock = require('nock')
const httpMocks = require('node-mocks-http')
jest.mock('jsonwebtoken')
jest.mock('http-errors')

let oauth

describe('Oauth Utility', () => {
  const OLD_ENV = process.env

  const request = httpMocks.createRequest({
    method: 'GET',
    url: '/test',
    cookies: {
      'access-token': 'accesstoken',
      'refresh-token': 'refreshtoken'
    }
  })
  const response = httpMocks.createResponse({
    eventEmitter: require('events').EventEmitter
  })

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    process.env.FRONT_END_DOMAIN = 'http://test.com'
    process.env.COOKIE_SECURE_FLAG = 'true'
    process.env.BUNGIE_DOMAIN = 'http://test.com'
    process.env.OAUTH_ACCESS_GRANT_TYPE = 'access'
    process.env.OAUTH_REFRESH_GRANT_TYPE = 'refresh'
    process.env.BUNGIE_CLIENT_ID = '1234'
    process.env.OAUTH_CLIENT_SECRET = 'false'

    oauth = require('./oauth')
  })

  afterEach(() => {
    process.env = OLD_ENV // restore old env
  })

  test('should request new tokens from bungie', async () => {
    nock(process.env.BUNGIE_DOMAIN)
      .post('/platform/app/oauth/token/')
      .reply(200, { access_token: 'access', refresh_token: 'refresh' })

    spyOn(oauth, 'setTokenCookies').and.callFake((response, req, res) => {})

    await oauth.oauthRequest({ message: 'hello' }, request, response)

    expect(oauth.setTokenCookies).toHaveBeenCalled()
  })

  describe('authorization function', () => {
    test('should set authorization in the header if access token is available', async () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/test',
        headers: {
          'x-access-token': 'accesstoken',
          'x-refresh-token': 'refreshtoken'
        }
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      const authToken = await oauth.authorization(request, response)

      expect(authToken).toEqual('Bearer accesstoken')
    })

    test('should throw with a 401 if access tokens are n/a', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/test',
        headers: {}
      })
      const response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      })

      expect(() => {
        oauth.authorization(request, response)
      }).toThrow()
    })
  })

  test('should return the body needed for requesting tokens', () => {
    const tokensBody = oauth.tokensBody('code123')

    expect(tokensBody).toEqual({
      client_id: '1234',
      client_secret: 'false',
      code: 'code123',
      grant_type: 'access'
    })
  })

  test('should return the body needed for refreshing tokens', () => {
    const refreshBody = oauth.refreshBody('refresh')

    expect(refreshBody).toEqual({
      client_id: '1234',
      client_secret: 'false',
      grant_type: 'refresh',
      refresh_token: 'refresh'
    })
  })

  test('should set cookies with values taken from the request', () => {
    spyOn(response, 'cookie').and.callFake((name, value, options) => { })

    oauth.setTokenCookies({
      access_token: 'testAcc',
      refresh_token: 'testRef'
    }, request, response)

    expect(response.cookie).toHaveBeenCalled()
  })

  test('should delete tokens', () => {
    const accessOptions = {
      domain: process.env.FRONT_END_DOMAIN,
      expires: new Date(Date.now() + 60 * 20 * 1000), // 20 minutes in milliseconds
      secure: (process.env.COOKIE_SECURE_FLAG === 'true')
    }
    const refreshOptions = {
      domain: process.env.FRONT_END_DOMAIN,
      expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // 1 week in milliseconds
      httpOnly: true,
      secure: (process.env.COOKIE_SECURE_FLAG === 'true')
    }

    response.cookie('access-token', 'access12345', accessOptions)
    response.cookie('refresh-token', 'refresh12345', refreshOptions)

    spyOn(response, 'clearCookie').and.callThrough()

    oauth.deleteTokens(request, response)

    expect(response.clearCookie).toHaveBeenCalled()
  })
})
