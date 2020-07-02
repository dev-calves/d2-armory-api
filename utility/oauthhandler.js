
module.exports = async function oauthHandler(error, req, res, next) {
    const OAuthUtility = require('./oauth');
    const axios = require('axios');
    const createError = require('http-errors');

    // errors caused by HTTP 401 need a new access token
    if (error.status == 401 || error.statusCode == 401) {
        // request for a new token.
        if (req.headers['x-refresh-token']) {
            // request new tokens and set them as cookies for future requests.
            await refreshTokenRequest(OAuthUtility, req, res, next);

            // re-try the service that failed with a 401, using the new access token.
            try {
                error = null; // nullify the 401 error to avoid triggering error handlers based on it.
                await retryRequest(OAuthUtility, axios, req, res, next);
            } catch (error) {
                next(error.response);
                return;
            }
        } else {
            // when both access and refresh tokens are not available, respond to the client with a 401
            return next(createError(401, 'Please login to use this service.'));
        }
    } else {
        // move non 401 errors to the error-handler
        next(error);
        return;
    }
}

async function refreshTokenRequest(oauth, req, res, next) {
    try {
        // request tokens
        await oauth.oauthRequest(oauth.refreshBody(req.headers['x-refresh-token']), req, res);
        return; // prevent further execution of code.
    } catch (error) {
        // log user out if refresh request returns unauthorized
        if (error.status == 401 || error.statusCode == 401) {
            // log user out
            oauth.deleteTokens(req, res);
        }

        // move error to the error-handler
        next(error);
        return; // prevent further execution of code.
    }
}

async function retryRequest(oauth, axios, req, res, next) {
    // take initial client request information
    const baseURL = `${req.protocol}://${process.env.SERVER_DOMAIN}`;
    const url = req.path;
    const method = req.method;
    const headers = req.headers;
    const params = req.params;
    const data = req.body;

    // re-try client request with the tokens available.
    let response;
    try {
        response = await axios({
            baseURL: baseURL,
            url: url,
            method: method,
            headers: headers,
            params: params,
            data: data
        });
    } catch (error) {
        next(error);
        return; // prevent further execution of code.
    }

    res.status(200).json(response.data);
    return; // prevent further execution of code.
}