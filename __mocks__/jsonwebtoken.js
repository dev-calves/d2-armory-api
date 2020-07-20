module.exports = {
  sign: (token) => {
    return 'testSigned123'
  },
  verify: (value, secret) => {
    return {
      token: value
    }
  }
}
