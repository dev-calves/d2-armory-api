const { body } = require('express-validator')

module.exports = [
  body('characterId')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be in a string')
    .isLength({ min: 19, max: 19 }).withMessage('must be 19 characters')
    .isNumeric().withMessage('must only contain numbers')
]
