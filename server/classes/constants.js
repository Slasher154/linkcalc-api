/**
 * Created by thanatv on 2/22/18.
 */

class Constant {
    constructor (constantArray) {
        constantArray.forEach(c => {
            this[c.alias] = c.value
        })
    }
}

module.exports = Constant