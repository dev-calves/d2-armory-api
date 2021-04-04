const oauth = require('../oauth/oauth')

/**
 * makes requests to the server apis inventory-character's multiple item route.
 * @param {*} req client request
 * @param {*} res server response
 * @param {string} membershipType game-console associated with the bungie account.
 * @param {string} membershipId account id with bungie.
 * @param {string} characterId id for the specific destiny 2 character
 * @returns Promise of inventory-character response data, contains equipment.
 */
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

  const characterResponse = await oauth.request(characterOption, req, res)

  return characterResponse.data
}

module.exports = characterInventory
