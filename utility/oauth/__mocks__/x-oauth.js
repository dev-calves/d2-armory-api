module.exports = {
  async authorization (req, res) {
    return 'token1234'
  },
  async oauthRequest (tokens, res) {
    return 'token1234'
  },
  tokensBody (code) {
    return { body: 'tokens' }
  },
  deleteTokens (req, res) {

  },
  refreshBody (refresh) {
    return {
      tokens: 'tokensresponse'
    }
  }
}
