const { body } = require('express-validator')

module.exports = [
  body('membershipId')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be in a string')
    .isNumeric().withMessage('must only contain numbers')
    .isLength({ min: 19, max: 19 }).withMessage('must be 19 characters')
]
