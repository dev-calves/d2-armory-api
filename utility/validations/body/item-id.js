const { body } = require('express-validator')

module.exports = [
  body('itemId')
    .notEmpty().withMessage('required parameter')
    .isNumeric().withMessage('must only contain numbers')
]
