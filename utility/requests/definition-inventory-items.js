const oAuthUtility = require('../oauth/oauth')

async function definitionInventoryItems (req, res, data) {
  // request options
  let inventoryItemOption = {}

  inventoryItemOption = {
    method: 'POST',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
    url: '/api/definition/inventory-items',
    data: data
  }

  const inventoryItemResponse = await oAuthUtility.request(inventoryItemOption, req, res)

  return inventoryItemResponse.data
}

module.exports = definitionInventoryItems
