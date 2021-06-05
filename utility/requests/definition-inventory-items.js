const oauth = require('../oauth/oauth')

/**
 * makes requests to the definition-inventory api for a multiple items
 * @param {*} req client request
 * @param {*} res server response
 * @param {*} data body data
 * @returns Promise of inventory item response data
 */
async function definitionInventoryItems (req, res, data) {
  // request options
  let inventoryItemOption = {}

  inventoryItemOption = {
    method: 'POST',
    baseURL: `${req.protocol}://${process.env.SERVER_DOMAIN}`,
    url: '/api/definition/inventory-items',
    data: data
  }

  const inventoryItemResponse = await oauth.request(inventoryItemOption, req, res)

  return inventoryItemResponse.data
}

module.exports = definitionInventoryItems
