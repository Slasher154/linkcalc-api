/**
 * Created by thanatv on 11/3/17.
 */

class Satellite {
    constructor (satelliteObject) {
        for (var field in satelliteObject) {
            this[field] = satelliteObject[field]
        }
    }
}

module.exports = Satellite