/**
 * Created by thanatv on 11/3/17.
 */
const Antenna = require('./antenna')
const Buc = require('./buc')
const Location = require('./location')
const Bandwidth = require('./bandwidth')

class Station {
    constructor (stationObject) {
        this.antenna = new Antenna(stationObject.antenna)
        this.location = new Location(stationObject.location)

        if (stationObject.buc) {
            this.buc = new Buc(stationObject.buc)
        }

        if (stationObject.bandwidth) {
            this.bandwidth = new Bandwidth(stationObject.bandwidth)
        }
    }
}

module.exports = Station