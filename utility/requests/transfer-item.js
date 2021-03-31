const oauth = require('../oauth/oauth')

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
