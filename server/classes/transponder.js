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
            return tp.name === beam && [path, 'broadcast'].includes(tp.type)
        })
    }

    getContour (contour) {
        if (contour === '50') {
            return this.contour_50
        } else if (contour === 'eoc') {
            return this.contour_eoc
        } else if (contour === 'eoc-2') {
            return this.contour_eoc - 2
        } else if (contour === 'peak') {
            return 0
        } else {
            return null
        }
    }


}

module.exports = Transponder