/**
 * Created by thanatv on 11/3/17.
 */

class Location {
    constructor (locationObject) {
        for (var field in locationObject) {
            this[field] = locationObject[field]
        }
    }
}

module.exports = Location