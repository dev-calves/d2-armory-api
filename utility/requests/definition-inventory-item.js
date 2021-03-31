const oauth = require('../oauth/oauth')

async function definitionInventoryItem (req, res, itemHash) {
  // request options
  let inventoryItemOption = {}

  inventoryItemOption = {
    method: 'GET',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
    url: `/api/definition/inventory-item?itemHash=${itemHash}`
  }

  const inventoryItemResponse = await oauth.request(inventoryItemOption, req, res)

  return inventoryItemResponse.data
}

module.exports = definitionInventoryItem
