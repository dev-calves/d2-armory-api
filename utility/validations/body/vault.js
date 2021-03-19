const { body } = require('express-validator')

module.exports = (required, vaultPath) => {
  const vault = vaultPath || 'vault'

  const validations = [
    ((required) ? body(vault).notEmpty().withMessage('required parameter') : body(vault).optional())
      .isArray().withMessage('must be an array'),
    body(`${vault}.[*]`)
      .isObject().withMessage('must be an object'),
    body(`${vault}.[*].itemHash`)
      .notEmpty().withMessage('required parameter')
      .isNumeric().withMessage('must be numerical'),
    body(`${vault}.[*].itemId`)
      .notEmpty().withMessage('required parameter')
      .isNumeric().withMessage('must be numerical')
  ]

  return validations
}
