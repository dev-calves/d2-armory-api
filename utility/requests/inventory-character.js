const oAuthUtility = require('../../utility/oauth/oauth')

async function characterInventory (req, res, membershipType, membershipId, characterId) {
  // request options
  const characterOption = {
    method: 'GET',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}/api`,
    url: `/inventory/character?membershipType=${membershipType}&membershipId=${membershipId}&characterId=${characterId}`,
    headers: {
      'x-access-token': req.headers['x-access-token'],
      'x-refresh-token': req.headers['x-refresh-token']
    }
  }

  const characterResponse = await oAuthUtility.request(characterOption, req, res)

  return characterResponse.data
}

module.exports = characterInventory
