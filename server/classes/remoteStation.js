/**
 * Created by thanatv on 11/3/17.
 */

const Station = require('./station')
const Utils = require('./utils')

class RemoteStation extends Station {
    constructor (stationObject) {
        super(stationObject)
    }

    eirpUplink(freq) {
        let ifl = this.buc.ifl || 0.3;
        let obo = this.buc.obo || 0.5;
        let ant_gain = this.antenna.txGain(freq)
        console.log("BUC size = " + this.buc.size + " IFL = " + ifl + " obo = " + obo + " ant_gain = " + ant_gain);
        return 10 * Utils.log10(this.buc.size) - ifl - obo + ant_gain;
    }

    print () {
        this.antenna.print()
        this.buc.print()
        this.location.print()
        if (this.transponder) {
            console.log(this.transponder.print())
        }
    }
}

module.exports = RemoteStation