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
    static searchByBeamAndPath(transponders, beam, path) {
        return transponders.find(tp => {
            return tp.name === beam && tp.type === path
        })
    }


}

module.exports = Transponder