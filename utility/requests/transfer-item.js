const oauth = require('../oauth/oauth')

/**
 * makes requests to the transfer-item api for multiple items.
 * @param {*} req client request
 * @param {*} res server response
 * @param {boolean} transferToVault true for character inventory->vault transfers, false for vault->character inventory
 * @param {string} membershipType game-console associated with the bungie account
 * @param {string} membershipId account id with bungie
 * @param {string} characterId id for the specific destiny 2 character
 * @param {[]} transfers list of objects containing itemIds and itemHash
 * @param {object} character response from inventory-character api
 * @param {object} vault response from inventory-vault api
 * @returns transfer response data
 */
const transferItems = async (req, res, transferToVault, membershipType, membershipId, characterId, transfers, character, vault) => {
  // request options
  const transferItemsOption = {
    method: 'POST',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
    url: '/api/transfer-items',
    headers: {
      'x-access-token': req.headers['x-access-token'] || '',
      'x-refresh-token': req.headers['x-refresh-token'] || ''
    },
    data: {
      transferToVault: transferToVault,
      transferItems: transfers,
      characterId: characterId,
      membershipType: membershipType,
      membershipId: membershipId,
      character: character || undefined,
      vault: vault || undefined
    }
  }

  const transferItemsResponse = await oauth.request(transferItemsOption, req, res)

  return transferItemsResponse.data
}

module.exports = transferItems
