const jsonata = require('jsonata')
const express = require('express')
const router = express.Router()

const utility = require('../../utility')
const logger = require('../../winston')

/**
 * retrieves membership info for the account authenticated with bungie's oauth token.
 */
/* GET current-user-membership */
router.get('/current-user-membership', (req, res, next) => {
  // retrieve current user's data
  return currentUserMembershipService(req, res).then(response => {
    logger.debug({ message: req.path, response: response })

    return res.status(200).json(response)
  }).catch(error => {
    next(error)
    return
  })
})

/**
 * builds a request to be sent to bungie's getmembershipsforcurrentuser api
 * @param {*} req Client Request
 * @param {*} res Server Response
 * @returns transformed response from bungie
 */
async function currentUserMembershipService (req, res) {
  // request options
  const requestOptions = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: '/Platform/User/GetMembershipsForCurrentUser/',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: await utility.oauth.authorization(req, res)
    }
  }

  const currentUserMembershipResponse = await utility.oauth.request(requestOptions, req, res)

  const response = transform(currentUserMembershipResponse.data)

  return response
}

/**
 * transforms the response from bungie for the client.
 * @param {*} currentUserResponse bungie response
 * @returns transformed response.
 */
function transform (currentUserResponse) {
  // expression to transform the response
  const expression = jsonata(`{
    "membershipId": (Response.primaryMembershipId? Response.primaryMembershipId : Response.destinyMemberships[0].membershipId),
    "membershipType": $string((Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].membershipType : Response.destinyMemberships[0].membershipType)),
    "displayName": (Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].displayName : Response.destinyMemberships[0].displayName)
  }`)

  // transform response
  const response = expression.evaluate(currentUserResponse)

  return response
}

module.exports = router
