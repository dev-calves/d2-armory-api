const { query } = require('express-validator')

module.exports = [
  query('membershipId')
    .notEmpty().withMessage('required parameter')
    .isLength({ min: 19, max: 19 }).withMessage('must be 19 characters')
    .isNumeric().withMessage('must only contain numbers')
]
