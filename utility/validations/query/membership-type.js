const { query } = require('express-validator')

module.exports = [
  query('membershipType')
    .notEmpty().withMessage('required parameter')
    .isNumeric().withMessage('must only contain numbers')
]
