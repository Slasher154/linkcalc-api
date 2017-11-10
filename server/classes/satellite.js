/**
 * Created by thanatv on 11/3/17.
 */

class Satellite {
    constructor (satelliteObject) {
        for (var field in satelliteObject) {
            this[field] = satelliteObject[field]
        }
    }

    get isBroadband () {
        return this.type === 'Broadband'
    }

    get isConventional () {
        return this.type === 'Conventional'
    }
}

module.exports = Satellite