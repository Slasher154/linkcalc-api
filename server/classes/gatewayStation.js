/**
 * Created by thanatv on 11/3/17.
 */

const Station = require('./station')

class GatewayStation extends Station {
    constructor (stationObject) {
        super(stationObject)
    }

    eirpUplink(freq) {
        let ifl = this.hpa.ifl || 0.3;
        let obo = this.hpa.obo || 0.5;
        let ant_gain = this.antenna.txGain(freq)
        console.log("HPA size = " + hpa.size + " IFL = " + ifl + " obo = " + obo + " ant_gain = " + ant_gain);
        return 10 * this.log10(hpa.size) - ifl - obo + ant_gain;
    }
}

module.exports = GatewayStation