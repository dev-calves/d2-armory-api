const axios = require('axios')
const jsonata = require('jsonata')
const { query, validationResult } = require('express-validator')
const ClassEnum = require('./models/class')
const GenderEnum = require('./models/gender')
const RaceEnum = require('./models/race')
const express = require('express')

const router = express.Router()

/* GET characters */
router.get('/characters', [
  // validations
  query('membershipId').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer'),
  query('membershipType').notEmpty().withMessage('required parameter').isInt().withMessage('must be an integer')
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }

  return charactersService(req, res).then(response => {
    return res.status(200).json(response)
  })
})

module.exports = router

/**
 *
 * @param {*} req
 * @param {*} next
 */
async function charactersService (req, next) {
  // request options
  const charactersOption = {
    headers: {
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  const charactersResponse = await request(charactersOption, req, next)

  // trim content
  const response = transform(charactersResponse)

  return response
}

/**
 *
 * @param {*} charactersOption
 * @param {*} req
 * @param {*} next
 */
async function request (charactersOption, req, next) {
  // get request for list of user's characters
  let charactersResponse

  try {
    charactersResponse =
      await axios.get(`${process.env.BUNGIE_DOMAIN}/Platform/Destiny2/${req.query.membershipType}/Profile/${req.query.membershipId}/?components=200`, charactersOption)
  } catch (error) {
    next(error)
    return // prevent further execution of code.
  }

  return charactersResponse
}

/**
 *
 * @param {*} charactersResponse
 */
function transform (charactersResponse) {
  // expression for transforming the response
  const expression = jsonata(`Response.characters.data.*.{
      "class": classType, 
      "race": raceType,
      "gender": genderType,
      "light": light,
      "emblem": ('${process.env.BUNGIE_DOMAIN}' & emblemPath),
      "background": ('${process.env.BUNGIE_DOMAIN}' & emblemBackgroundPath)
    }`)

  // response transformed
  const response = expression.evaluate(charactersResponse.data)

  // convert enum integers into enum string
  response.forEach((character) => {
    character.class = ClassEnum[parseInt(character.class)]
    character.race = RaceEnum[parseInt(character.race)]
    character.gender = GenderEnum[parseInt(character.gender)]
  })

  return response
}
