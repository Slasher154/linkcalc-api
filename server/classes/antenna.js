/**
 * Created by thanatv on 11/3/17.
 */

class Antenna {
    constructor (antennaObject) {
        for (var field in antennaObject) {
            this[field] = antennaObject[field]
        }
    }
}

module.exports = Antenna