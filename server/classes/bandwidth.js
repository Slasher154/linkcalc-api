/**
 * Created by thanatv on 11/3/17.
 */

class Bandwidth {
    constructor (bandwidthObject) {
        for (var field in bandwidthObject) {
            this[field] = bandwidthObject[field]
        }
    }
}

module.exports = Bandwidth