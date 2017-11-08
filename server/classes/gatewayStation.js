/**
 * Created by thanatv on 11/3/17.
 */

const Station = require('./station')

class GatewayStation extends Station {
    constructor (stationObject) {
        super(stationObject)
    }
}

module.exports = GatewayStation