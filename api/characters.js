var express = require('express');
var router = express.Router();

/* GET characters */
router.get('/characters', function (req, res, next) {
  console.log('reached the characters service.');
  res.status(200).json([
    {
      class: "Warlock",
      race: "Awoken",
      gender: "Male",
      light: "963",
      emblem: "https://www.bungie.net/common/destiny2_content/icons/e62cc4b66807b628be0af671539eaa9d.jpg",
      background: "https://www.bungie.net/common/destiny2_content/icons/d7c108a27b93e8e97af8d962ff6d73a9.jpg"
    },
    {
      class: "Hunter",
      race: "Exo",
      gender: "Male",
      light: "948",
      emblem: "https://www.bungie.net/common/destiny2_content/icons/5dc023c8be5d682eae90be7f5d420f69.jpg",
      background: "https://www.bungie.net/common/destiny2_content/icons/e452c62485491a02fbc0e36f06d301d2.jpg"
    },
    {
      class: "Titan",
      race: "Human",
      gender: "Male",
      light: "904",
      emblem: "https://www.bungie.net/common/destiny2_content/icons/cb30b5a9b34f7204b064570b56576562.jpg",
      background: "https://www.bungie.net/common/destiny2_content/icons/ecafe3e611c54e78656b85b77c8ee2f7.jpg"
    }]);
});

module.exports = router;