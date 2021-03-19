const oAuthUtility = require('../oauth/oauth')

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

  const vaultResponse = await oAuthUtility.request(vaultOption, req, res)

  return vaultResponse.data
}

module.exports = vaultInventory
