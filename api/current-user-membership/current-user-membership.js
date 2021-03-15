const jsonata = require('jsonata')
const express = require('express')
const router = express.Router()

const oAuthUtility = require('../../utility/oauth/oauth')
const logger = require('../../winston')

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

async function currentUserMembershipService (req, res) {
  // request options
  const requestOptions = {
    method: 'GET',
    baseURL: `${process.env.BUNGIE_DOMAIN}`,
    url: '/Platform/User/GetMembershipsForCurrentUser/',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      Authorization: oAuthUtility.authorization(req, res)
    }
  }

  let currentUserMembershipResponse
  try {
    currentUserMembershipResponse = await oAuthUtility.request(requestOptions, req, res)
  } catch (error) {
    throw (error.response)
  }
  const response = transform(currentUserMembershipResponse.data)

  return response
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
  const response = expression.evaluate(currentUserResponse)

  return response
}

module.exports = router
