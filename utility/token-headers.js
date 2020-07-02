module.exports = function setTokenHeaders(req, res, next) {
    if (req.cookies['access-token']) {
        req.headers['x-access-token'] = req.cookies['access-token'];
    }
    if (req.cookies['refresh-token']) {
        req.headers['x-refresh-token'] = req.cookies['refresh-token'];
    }

    next();
}