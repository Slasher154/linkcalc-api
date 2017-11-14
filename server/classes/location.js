/**
 * Created by thanatv on 11/3/17.
 */

class Location {
    constructor (locationObject) {
        for (var field in locationObject) {
            this[field] = locationObject[field]
        }
    }

    print () {
        if (this.lat && this.lon) {
            console.log(`Location: ${this.name} (${this.lat},${this.lon})`)
        } else {
            console.log(`Location: ${this.name}`)
        }
    }
}

module.exports = Location