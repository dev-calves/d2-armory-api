const bucketHash = require('../bucket-hash')

module.exports =
`Response.profileInventory.data.items[bucketHash=${bucketHash.GENERAL}].
            {
                "itemHash": $string(itemHash),
                "itemInstanceId": $string(itemInstanceId)
            }
`
