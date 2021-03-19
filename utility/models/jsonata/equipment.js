const bucketHash = require('../bucket-hash')

module.exports =
    `**.data.{
                "Kinetic_Weapons": [items[bucketHash=${bucketHash.KINETIC_WEAPONS}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Energy_Weapons": [items[bucketHash=${bucketHash.ENERGY_WEAPONS}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Power_Weapons": [items[bucketHash=${bucketHash.POWER_WEAPONS}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Helmet": [items[bucketHash=${bucketHash.HELMET}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Gauntlets": [items[bucketHash=${bucketHash.GAUNTLETS}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Chest_Armor": [items[bucketHash=${bucketHash.CHEST_ARMOR}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Leg_Armor": [items[bucketHash=${bucketHash.LEG_ARMOR}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Class_Armor": [items[bucketHash=${bucketHash.CLASS_ARMOR}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ],
                "Subclass": [items[bucketHash=${bucketHash.SUBCLASS}].
                    {
                        "itemHash": $string(itemHash),
                        "itemId": $string(itemInstanceId)
                    }
                ]
    }`
