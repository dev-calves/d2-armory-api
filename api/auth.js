var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/auth', function(req, res, next) {
    console.log('reached the auth service.');
    res.send('reached the auth service');
});

module.exports = router;