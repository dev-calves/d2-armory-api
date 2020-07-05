module.exports = {
  authorization (req) {
    return ''
  },
  oauthRequest (tokens, req, res) {
    return Promise.resolve({ response: 'requestResponse' })
  },
  tokensBody (code) {
    return { body: 'tokens' }
  },
  deleteTokens (req, res) {

  },
  refreshBody (header, req, res) {
    return {
      tokens: 'tokensresponse'
    }
  }
}
