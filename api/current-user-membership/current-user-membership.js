const axios = require('axios')
const jsonata = require('jsonata')
const express = require('express')
const OAuthUtility = require('../../utility/oauth/oauth')

const router = express.Router()

/* GET current-user-membership */
router.get('/current-user-membership', (req, res, next) => {
  console.info('/current-user-membership - request: ')

  // retrieve current user's data
  return currentUserMembershipService(req, res, next).then(response => {
    console.info('/current-user-membership - response: ', response)

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

async function currentUserMembershipService (req, res, next) {
  // request options
  const requestOptions = {
    headers: {
      'X-API-Key': process.env.API_KEY,
      Authorization: OAuthUtility.authorization(req, res)
    }
  }

  let currentUserMembershipResponse
  try {
    currentUserMembershipResponse = await request(requestOptions, next)
  } catch (error) {
    throw (error.response)
  }
  const response = transform(currentUserMembershipResponse)

  return response
}

/**
 *
 * @param {*} requestOptions
 * @param {*} next
 */
async function request (requestOptions, next) {
  console.info('/current-user-membership - options: ', requestOptions)

  // get current user membership request
  const currentUserResponse =
      await axios.get(`${process.env.BUNGIE_DOMAIN}/Platform/User/GetMembershipsForCurrentUser/`,
        requestOptions)

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
