/**
 * Created by thanatv on 11/3/17.
 */
const Antenna = require('./antenna')
const Buc = require('./buc')
const Location = require('./location')
const Bandwidth = require('./bandwidth')
const Utils = require('./utils')

class Station {
    constructor (stationObject) {
        this.antenna = new Antenna(stationObject.antenna)
        this.location = new Location(stationObject.location)

        if (stationObject.buc) {
            this.buc = new Buc(stationObject.buc)
        }

        if (stationObject.bandwidth) {
            this.bandwidth = new Bandwidth(stationObject.bandwidth)
        }
    }

    get contour() {
        return 0
    }

    gt(freq, attenuation, condition) {
        if (this.antenna.gt) {
            return this.antenna.gt
        } else {
            let antennaTemperature = Antenna.temp(attenuation, condition);
            let systemTemperature = this.systemTemp(antennaTemperature)

            let rxGain = this.antenna.rxGain(freq)
            let antGt = rxGain - 10 * Utils.log10(systemTemperature)

            console.log("----------Antenna---------------");
            console.log("Antenna Temp: " + antennaTemperature + " K");
            console.log("System Temp: " + systemTemperature + " K");
            console.log("Ant Gain: " + rxGain + "dBi");

            return antGt
        }

    }

    static systemTemp(antennaTemp) {
        // temp at before feed
        var sigma_f = Math.pow(10, ifl / 10);
        var tf = 290; // Feed ambient temperature
        return antennaTemp + (sigma_f-1) * tf + sigma_f * lna_noise;

        // temp at after feed
        //var sigma_f = Math.pow(10, -ifl / 10);
        //var tf = 290; // Feed ambient temperature
        //return lna_noise + (1 - sigma_f) * tf + sigma_f * antenna_temp;
    }
}

module.exports = Station