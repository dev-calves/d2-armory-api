const oauth = require('../oauth/oauth')

/**
 * makes requests to the definition-inventory api for a single item
 * @param {*} req client request
 * @param {*} res server response
 * @param {string} itemHash reference general info about an item
 * @returns Promise of response data from the service
 */
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
