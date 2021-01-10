/* eslint no-prototype-builtins: "off" */

const logger = require('../../winston')

module.exports = (code, req) => {
  if (errorEnum.hasOwnProperty(code)) {
    return errorEnum[code]
  } else {
    // log the errorcode for definition lookup on bungie's site.
    logger.debug({ message: req.path, undefinedBungieErrorCode: code })

    return errorEnum[0]
  }
}

// error code definitions taken from Bungie's platform site.
// https://bungie-net.github.io/multi/schema_Exceptions-PlatformErrorCodes.html#schema_Exceptions-PlatformErrorCodes
const errorEnum = Object.freeze({
  0: 'None',
  1: 'Success',
  1620: 'Character not found',
  1623: 'Item not found'
})
