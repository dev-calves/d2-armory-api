const OAuthUtility = require('../utility/oauth');
const express = require('express');

const router = express.Router();

router.get('/oauth/access', async (req, res, next) => {

    // request to receive tokens.
    try {
        await OAuthUtility.oauthRequest(OAuthUtility.tokensBody(req.get("code")), req, res);
    } catch (error) {
        next(error);
        return; // prevent further execution of code.
    }

    // send ok response
    res.status(200).json({ "message": "tokens recieved." });
    return; // prevent further execution of code.
});

router.get('/oauth/delete', async (req, res, next) => {
    // delete tokens.
    OAuthUtility.deleteTokens(req, res);

    // send ok response
    res.status(200).json({ "message": "tokens deleted." });
    return; // prevent further execution of code.
});

module.exports = router;