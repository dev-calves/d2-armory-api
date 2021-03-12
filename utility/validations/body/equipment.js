const { body } = require('express-validator')

module.exports = [
  body('equipment')
    .notEmpty().withMessage('required parameter'),
  body('equipment.Kinetic_Weapons')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Energy_Weapons')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Power_Weapons')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Helmet')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Gauntlets')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Chest_Armor')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Leg_Armor')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Class_Armor')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.Subclass')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('equipment.*.[*].itemHash')
    .notEmpty().withMessage('required parameter')
    .isInt().withMessage('must be in a string')
    .isString().withMessage('must be an int value'),
  body('equipment.*.[*].itemInstanceId')
    .notEmpty().withMessage('required parameter')
    .isInt().withMessage('must be in a string')
    .isString().withMessage('must be an int value')
]
