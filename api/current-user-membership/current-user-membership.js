const axios = require('axios')
const jsonata = require('jsonata')
const express = require('express')
const OAuthUtility = require('../../utility/oauth/oauth')

const router = express.Router()

/* GET current-user-membership */
router.get('/current-user-membership', (req, res, next) => {
  OAuthUtility.authorization(req, res).then(token => {
    // retrieve user data
    return currentUserMembershipService(token, next).then(response => {
      return res.status(200).json(response)
    })
  }).catch(error => {
    next(error)
    return
  })
})

/**
 *
 * @param {*} token
 * @param {*} next
 */
async function currentUserMembershipService (token, next) {
  // request options
  const requestOptions = {
    headers: {
      'X-API-Key': process.env.API_KEY,
      Authorization: token
    }
  }

  const currentUserMembershipResponse = await request(requestOptions, next)
  const response = transform(currentUserMembershipResponse)

  return response
}

/**
 *
 * @param {*} requestOptions
 * @param {*} next
 */
async function request (requestOptions, next) {
  // get current user membership request
  let currentUserResponse
  try {
    currentUserResponse =
      await axios.get(`${process.env.BUNGIE_DOMAIN}/Platform/User/GetMembershipsForCurrentUser/`, requestOptions)
  } catch (error) {
    next(error)
    return // prevent further execution of code.
  }

  return currentUserResponse
}

/**
 *
 * @param {*} currentUserResponse
 */
function transform (currentUserResponse) {
  // expression to transform the response
  const expression = jsonata(`{
        "membershipId": (Response.primaryMembershipId? Response.primaryMembershipId : Response.destinyMemberships[0].membershipId),
        "membershipType": (Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].membershipType : Response.destinyMemberships[0].membershipType) ,
        "displayName": (Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].displayName : Response.destinyMemberships[0].displayName)
    }`)

  // transform response
  const response = expression.evaluate(currentUserResponse.data)

  return response
}

module.exports = router
