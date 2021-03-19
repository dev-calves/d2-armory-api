const { body } = require('express-validator')

module.exports = [
  body('itemHashes')
    .notEmpty().withMessage('required parameter')
    .isArray().withMessage('must be an array'),
  body('itemHashes[*]')
    .notEmpty().withMessage('required parameter')
    .isString().withMessage('must be a string')
    .isNumeric().withMessage('must only contain numbers')
]
