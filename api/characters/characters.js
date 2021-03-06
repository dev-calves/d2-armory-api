const jsonata = require('jsonata')
const { validationResult } = require('express-validator')
const logger = require('../../winston')
const createError = require('http-errors')
const express = require('express')
const router = express.Router()

const ClassEnum = require('./models/class')
const GenderEnum = require('./models/gender')
const RaceEnum = require('./models/race')
const utility = require('../../utility')
const validations = require('../../utility/validations/query')

/**
 * retrieves a list of characters for an account.
 */
/* GET characters */
router.get('/characters', [
  // validations
  validations.membershipId,
  validations.membershipType
], (req, res, next) => {
  // validation error response
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = { errors: errors.array() }

    logger.warn({ message: req.path, bad: message })

    next(createError(422, message))
    return
  }

  logger.debug({ message: req.path, headers: req.headers, request: req.query })

  return charactersService(req, res).then(response => {
    logger.debug({ message: req.path, clientResponse: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

module.exports = router

/**
 * builds a request to be sent to bungie's profile api.
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @returns response to client
 */
async function charactersService (req, res) {
  // request options
  const charactersOption = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: `/Platform/Destiny2/${req.query.membershipType}/Profile/${req.query.membershipId}/?components=200`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY
    }
  }

  // request characters
  let charactersResponse
  try {
    charactersResponse = await utility.oauth.request(charactersOption, req, res)
  } catch (error) {
    throw (error.response)
  }

  // trim content
  const response = transform(charactersResponse.data)

  return response
}

/**
 * transforms the bungie response into the client response.
 * @param {*} charactersResponse bungie response from the profile api
 * @returns list of characters
 */
function transform (charactersResponse) {
  // expression for transforming the response
  const expression = jsonata(`Response.characters.data.*.{
      "id": characterId,
      "class": classType, 
      "race": raceType,
      "gender": genderType,
      "light": light,
      "emblem": ('${process.env.BUNGIE_DOMAIN}' & emblemPath),
      "background": ('${process.env.BUNGIE_DOMAIN}' & emblemBackgroundPath)
    }`)

  // response transformed
  const response = expression.evaluate(charactersResponse)

  // convert enum integers into enum string
  response.forEach((character) => {
    character.class = ClassEnum[parseInt(character.class)]
    character.race = RaceEnum[parseInt(character.race)]
    character.gender = GenderEnum[parseInt(character.gender)]
  })

  return response
}
