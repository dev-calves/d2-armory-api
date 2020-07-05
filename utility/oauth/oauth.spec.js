/* eslint-disable jest/no-jasmine-globals */
/* eslint-disable jest/no-test-callback */
const nock = require('nock')
const httpMocks = require('node-mocks-http')
let oauth

describe('Oauth Utility', () => {
  const OLD_ENV = process.env

  const request = httpMocks.createRequest({
    method: 'GET',
    url: '/test',
    headers: {
      'x-access-token': 'accesstoken',
      'x-refresh-token': 'refreshtoken'
    },
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

  test('should request new tokens', async () => {
    nock(process.env.BUNGIE_DOMAIN)
      .post('/platform/app/oauth/token/')
      .reply(200, { 'access-token': 'access', 'refresh-token': 'refresh' })

    spyOn(oauth, 'setTokenHeaders').and.callFake((access, refresh, req) => {
      return
    })
    spyOn(oauth, 'setTokenCookies').and.returnValue('')

    await oauth.oauthRequest({ message: 'hello' }, request, response)

    expect(oauth.setTokenHeaders).toHaveBeenCalled()
    expect(oauth.setTokenCookies).toHaveBeenCalled()
  })

  test('should set authorization in the header', () => {
    const authToken = oauth.authorization(request, function next () {})

    expect(authToken).toEqual('Bearer accesstoken')
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

  test('should set cookies with values taken from the x-headers', () => {
    spyOn(response, 'cookie').and.callFake((name, value, options) => {})

    oauth.setTokenCookies(request, response)

    expect(response.cookie).toHaveBeenCalled()
  })

  test('should set x-headers with values taken from cookies', () => {
    request.headers['x-access-token'] = ''
    request.headers['x-refresh-token'] = ''

    oauth.setTokenHeaders('access1234', 'refresh1234', request)

    expect(request.headers['x-access-token']).toEqual('access1234')
    expect(request.headers['x-refresh-token']).toEqual('refresh1234')
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
    expect(request.headers['x-access-token']).not.toBeDefined()
    expect(request.headers['x-refresh-token']).not.toBeDefined()
  })
})
