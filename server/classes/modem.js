/**
 * Created by thanatv on 11/3/17.
 */

class Modem {
    constructor (modemObject) {
        for (var field in modemObject) {
            this[field] = modemObject[field]
        }
    }
}

module.exports = Modem