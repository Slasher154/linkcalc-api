/**
 * Created by thanatv on 11/3/17.
 */

const gatewayStation = require('./gatewayStation')
const remoteStation = require('./remoteStation')
const satellite = require('./satellite')
const transponder = require('./transponder')
const bandwidth = require('./bandwidth')
const modem = require('./modem')

class Transmission {
    constructor (transmissionObject) {
        for (var field in transmissionObject) {
            this[field] = transmissionObject[field]
        }
    }
}

module.exports = Transmission