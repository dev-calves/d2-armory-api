const { query } = require('express-validator')

module.exports = [
  query('itemHash')
    .notEmpty().withMessage('required parameter')
    .isNumeric().withMessage('must only contain numbers')
]
