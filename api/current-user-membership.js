const axios = require('axios')
const jsonata = require('jsonata')
const express = require('express')
const OAuthUtility = require('../utility/oauth')

const router = express.Router()

/* GET current-user-membership */
router.get('/current-user-membership', (req, res, next) => {
  // request options
  const requestOptions = {
    headers: {
      'X-API-Key': process.env.API_KEY,
      Authorization: OAuthUtility.authorization(req, next)
    }
  };

  (async () => {
    // get current user membership request
    let currentUserResponse
    try {
      currentUserResponse =
                await axios.get(`${process.env.BUNGIE_DOMAIN}/Platform/User/GetMembershipsForCurrentUser/`, requestOptions)
    } catch (error) {
      next(error)
      return // prevent further execution of code.
    }

    // expression to transform the response
    const expression = jsonata(`{
                "membershipId": (Response.primaryMembershipId? Response.primaryMembershipId : Response.destinyMemberships[0].membershipId),
                "membershipType": (Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].membershipType : Response.destinyMemberships[0].membershipType) ,
                "displayName": (Response.primaryMembershipId? Response.destinyMemberships[membershipId=$$.Response.primaryMembershipId].displayName : Response.destinyMemberships[0].displayName)
            }`)

    // transform response
    const response = expression.evaluate(currentUserResponse.data)

    // send response
    return res.status(200).json(response) // prevent further execution of code.
  })()
})

module.exports = router
