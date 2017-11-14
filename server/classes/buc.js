/**
 * Created by thanatv on 11/3/17.
 */

class Buc {
    constructor (bucObject) {
        for (var field in bucObject) {
            this[field] = bucObject[field]
        }
    }

    print () {
        console.log(`BUC: ${this.name}`)
    }
}

module.exports = Buc