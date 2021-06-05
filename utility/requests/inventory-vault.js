const oauth = require('../oauth/oauth')

/**
 * makes requests to inventory-vault.
 * @param {*} req client request
 * @param {*} res server response
 * @param {string} membershipType game-console associated with the bungie account
 * @param {string} membershipId account id with bungie
 * @returns Promise of inventory-vault response data.
 */
async function vaultInventory (req, res, membershipType, membershipId) {
  // request options
  const vaultOption = {
    method: 'GET',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
    url: `/api/inventory/vault?membershipType=${membershipType}&membershipId=${membershipId}`,
    headers: {
      'x-access-token': req.headers['x-access-token'] || '',
      'x-refresh-token': req.headers['x-refresh-token'] || ''
    }
  }

  const vaultResponse = await oauth.request(vaultOption, req, res)

  return vaultResponse.data
}

module.exports = vaultInventory
