/**
 * Created by thanatv on 11/3/17.
 */
const Antenna = require('./antenna')
const Buc = require('./buc')
const Location = require('./location')
const Bandwidth = require('./bandwidth')
const Transponder = require('./transponder')
const Utils = require('./utils')

class Station {
    constructor (stationObject) {

        if (stationObject.antenna) {
            this.antenna = new Antenna(stationObject.antenna)
        }

        if (stationObject.location) {
            this.location = new Location(stationObject.location)
        }

        if (stationObject.buc) {
            this.buc = new Buc(stationObject.buc)
        }

        if (stationObject.bandwidth) {
            this.bandwidth = new Bandwidth(stationObject.bandwidth)
        }

        if (stationObject.transponder) {
            this.transponder = new Transponder(stationObject.transponder)

            // If location type is defined contours, use the transponder lat/lon to represent this remote station location
            if (this.location && this.location.type === 'definedContours' && this.transponder.lat && this.transponder.lon) {
                this.location.lat = this.transponder.lat
                this.location.lon = this.transponder.lon

                // Set the station contour to the contour value
                let contourValue = this.location.name.replace('%', '') // Remove % signs from 50% value
                this.contour = this.transponder[`contour_${contourValue}`]
            }
        } else {
            this.contour = 0
        }
    }

    static get ifl () {
        return 0.3
    }

    static get lnaNoise () {
        return 60
    }

    gt(freq, attenuation, condition) {
        if (this.antenna.gt) {
            return this.antenna.gt
        } else {
            let antennaTemperature = Antenna.temp(attenuation, condition);
            let systemTemperature = Station.systemTemp(antennaTemperature)

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
        var sigma_f = Math.pow(10, this.ifl / 10);
        var tf = 290; // Feed ambient temperature
        return antennaTemp + (sigma_f-1) * tf + sigma_f * this.lnaNoise;

        // temp at after feed
        //var sigma_f = Math.pow(10, -ifl / 10);
        //var tf = 290; // Feed ambient temperature
        //return lna_noise + (1 - sigma_f) * tf + sigma_f * antenna_temp;
    }
}

module.exports = Station