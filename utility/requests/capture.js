const oAuthUtility = require('../../utility/oauth/oauth')

async function capture (req, res, membershipType, membershipId, characterId) {
  // request options
  const captureOption = {
    method: 'GET',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}/api`,
    url: `/equipment/capture?membershipType=${membershipType}&membershipId=${membershipId}&characterId=${characterId}`
  }

  const captureResponse = await oAuthUtility.request(captureOption, req, res)

  return captureResponse.data
}

module.exports = capture
