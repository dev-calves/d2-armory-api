const express = require('express')
const router = express.Router()
const path = require('path')

/* GET angular application service worker. */
router.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'ngsw-worker.js'))
})

module.exports = router
