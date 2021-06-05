const { body } = require('express-validator')

module.exports = [
  body('membershipType')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be in a string')
    .isNumeric().withMessage('must only contain numbers')
]
