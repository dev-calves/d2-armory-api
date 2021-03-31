const { body } = require('express-validator')

module.exports = [
  body('transferLocation')
    .optional()
    .isString().withMessage('must be a string')
    .isIn(['inventory', 'vault']).withMessage('optional parameter. If declared, must be either \'vault\', \'inventory\'')
]
