/**
 * Created by thanatv on 11/3/17.
 */

class Transponder {
    constructor (transponderObject) {
        for (var field in transponderObject) {
            this[field] = transponderObject[field]
        }
    }
    print () {
        console.log(`Transponder: ${this.name} - ${this.type}`)
    }


}

module.exports = Transponder