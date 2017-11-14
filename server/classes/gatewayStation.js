/**
 * Created by thanatv on 11/3/17.
 */

const Station = require('./station')
const Antenna = require('./antenna')

class GatewayStation extends Station {
    constructor (gatewayObject) {

        super(gatewayObject)

        for (var field in gatewayObject) {
            this[field] = gatewayObject[field]
        }

        if (this.lat && this.lon) {
            this.location = {
                lat: this.lat,
                lon: this.lon
            }
        }

        if (this.ant_size) {
            this.antenna = new Antenna({
                name: `${this.ant_size} m`,
                type: `Standard`,
                size: this.ant_size,
                vendor: `Standard`
            })
        }

    }

    eirpUplink(freq) {
        let ifl = this.hpa.ifl || 0.3;
        let obo = this.hpa.obo || 0.5;
        let ant_gain = this.antenna.txGain(freq)
        console.log("HPA size = " + hpa.size + " IFL = " + ifl + " obo = " + obo + " ant_gain = " + ant_gain);
        return 10 * this.log10(hpa.size) - ifl - obo + ant_gain;
    }

    print () {
        console.log(`Gateway: ${this.name}`)
    }
}

module.exports = GatewayStation