const { body } = require('express-validator')

module.exports = (required, equipmentPath, single) => {
  const equipment = equipmentPath || 'equipment'

  const validations = [
    (required) ? body(equipment).notEmpty().withMessage('required parameter') : body(equipment).optional(),
    body(equipment).custom((value, { req }) => {
      const allowedValues = [
        'Kinetic_Weapons',
        'Energy_Weapons',
        'Power_Weapons',
        'Helmet',
        'Gauntlets',
        'Chest_Armor',
        'Leg_Armor',
        'Class_Armor',
        'Subclass',
        'Ghost'
      ]

      if ((!value) || (value && Object.keys(value).every(slot => allowedValues.some(allowedSlot => slot === allowedSlot)))) return true
      else return false
    }).withMessage('equipment may only contain Kinetic_Weapons,Energy_Weapons,Power_Weapons,Helmet,Gauntlets,Chest_Armor,Leg_Armor,Class_Armor,Subclass slot types'),
    body(`${equipment}.*`)
      .isArray().withMessage('must be an array'),
    body(`${equipment}.*.[*]`)
      .isObject().withMessage('must be an object'),
    body(`${equipment}.*.[*].itemHash`)
      .notEmpty().withMessage('required parameter')
      .isNumeric().withMessage('must be numerical'),
    body(`${equipment}.*.[*].itemId`)
      .notEmpty().withMessage('required parameter')
      .isNumeric().withMessage('must be numerical')
  ]

  if (single) {
    validations.push(body(`${equipment}.*`)
      .custom(value => (Array.isArray(value) && value.length === 1)).withMessage('must contain one item'))
  }

  return validations
}
