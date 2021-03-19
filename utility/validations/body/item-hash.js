const { body } = require('express-validator')

module.exports = [
  body('itemHash')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be a string')
    .isNumeric().withMessage('must only contain numbers')
]
