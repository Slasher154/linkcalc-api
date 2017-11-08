/**
 * Created by thanatv on 11/3/17.
 */

class Transponder {
    constructor (transponderObject) {
        for (var field in transponderObject) {
            this[field] = transponderObject[field]
        }
        this.init()
    }


}

module.exports = Transponder