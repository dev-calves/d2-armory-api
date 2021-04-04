const oauth = require('../oauth/oauth')

/**
 * makes requests to the capture api, to be used by server apis
 * @param {*} req client request
 * @param {*} res server response
 * @param {string} membershipType game-console associated with the bungie account.
 * @param {string} membershipId account id with bungie.
 * @param {string} characterId id for the specific destiny 2 character
 * @returns Promise of character response holding equipment.
 */
async function capture (req, res, membershipType, membershipId, characterId) {
  // request options
  const captureOption = {
    method: 'GET',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}/api`,
    url: `/equipment/capture?membershipType=${membershipType}&membershipId=${membershipId}&characterId=${characterId}`
  }

  const captureResponse = await oauth.request(captureOption, req, res)

  return captureResponse.data
}

module.exports = capture
