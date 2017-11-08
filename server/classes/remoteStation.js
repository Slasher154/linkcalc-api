/**
 * Created by thanatv on 11/3/17.
 */

const Station = require('./station')

class RemoteStation extends Station {
    constructor (stationObject) {
        super(stationObject)
    }
}

module.exports = RemoteStation