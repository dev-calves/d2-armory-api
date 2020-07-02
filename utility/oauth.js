const qs = require('qs');
const axios = require('axios');
const createError = require('http-errors');

const accessCookieOptions = {
    domain: process.env.FRONT_END_DOMAIN,
    expires: new Date(Date.now() + 60 * 20 * 1000), // 20 minutes in milliseconds
    secure: (process.env.COOKIE_SECURE_FLAG === 'true')
}

const refreshCookieOptions = {
    domain: process.env.FRONT_END_DOMAIN,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // 1 week in milliseconds
    httpOnly: true,
    secure: (process.env.COOKIE_SECURE_FLAG === 'true')
}

module.exports = {
    async oauthRequest(data, req, res) {
        const url = `${process.env.BUNGIE_DOMAIN}/platform/app/oauth/token/`;
        const config = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };

        // POST request for the access token.
        // data is being stringified since axios doesn't support form requests for node.
        let oauthResponse;
        try {
            oauthResponse = await axios.post(url, qs.stringify(data), config);
        } catch (error) {
            throw (error);
        }

        // set token headers
        this.setTokenHeaders(
            oauthResponse.data["access_token"],
            oauthResponse.data["refresh_token"], req);

        // set token cookies
        this.setTokenCookies(req, res);

        return;
    },
    authorization(req) {
        let authKey = "";
        if (req.headers['x-access-token']) {
           authKey = req.headers["x-access-token"];
        } else {
            throw (createError(401, "Access token not available."));
        }

        return `Bearer ${authKey}`;
    },
    tokensBody(code) { // used to acquire access and refresh tokens
        const body = {
            "grant_type": process.env.OAUTH_ACCESS_GRANT_TYPE,
            "client_id": process.env.BUNGIE_CLIENT_ID,
            "code": code || "",
            "client_secret": process.env.OAUTH_CLIENT_SECRET
        }

        return body;
    },
    refreshBody(refresh) { // used to acquire access token
        const body = {
            "grant_type": process.env.OAUTH_REFRESH_GRANT_TYPE,
            "client_id": process.env.BUNGIE_CLIENT_ID,
            "refresh_token": refresh,
            "client_secret": process.env.OAUTH_CLIENT_SECRET
        }

        return body;
    },
    setTokenCookies(req, res) {
        if (req.headers['x-access-token']) {
            res.cookie('access-token', req.headers['x-access-token'], accessCookieOptions);
        }
        if (req.headers['x-refresh-token']) {
            res.cookie('refresh-token', req.headers['x-refresh-token'], refreshCookieOptions);
        }
        // TODO: may need to store member id from oauthResponse.
    },
    setTokenHeaders(access, refresh, req) {
        req.headers['x-access-token'] = access;
        req.headers['x-refresh-token'] = refresh;
        // TODO: may need to store member id from oauthResponse.
    },
    deleteTokens(req, res) {
        // set expiration date to the past.
        let accessExpiredCookieOptions = Object.assign({}, accessCookieOptions);
        accessExpiredCookieOptions.expires = new Date(Date.now() - (60 * 60 * 24 * 7 * 1000)); // minus 1 week
        let refreshExpiredCookieOptions = Object.assign({}, refreshCookieOptions);
        refreshExpiredCookieOptions.expires = new Date(Date.now() - (60 * 60 * 24 * 7 * 1000)); // minus 1 week

        // delete cookies, the values must be cleared and must have matching options as the cookies set except for expires and maxAge.
        if (req.cookies['access-token'] || req.cookies['access-token'] === "") res.clearCookie('access-token', accessExpiredCookieOptions);
        if (req.cookies['refresh-token'] || req.cookies['refresh-token'] === "") res.clearCookie('refresh-token', refreshExpiredCookieOptions);
        // TODO: may need to clear member id from oauthResponse.

        // delete cookie headers
        if (req.headers['x-access-token']) delete req.headers['x-access-token'];
        if (req.headers['x-refresh-token']) delete req.headers['x-refresh-token'];
        // TODO: check to see if they need to be deleted from res by checking the postman response.
    }
}