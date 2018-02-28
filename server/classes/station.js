/**
 * Created by thanatv on 11/3/17.
 */
const Antenna = require('./antenna')
const Buc = require('./buc')
const Contour = require('./contour')
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
            this.setTransponder('forward', stationObject.transponder)
        }

    }

    gt(freq, attenuation, condition) {
        if (this.antenna.gt) {
            return this.antenna.gt
        } else {
            let antennaTemperature = Antenna.temp(attenuation, condition);
            let systemTemperature = Station.systemTemp(antennaTemperature)

            let rxGain = this.antenna.rxGain(freq)
            let antGt = rxGain - 10 * Utils.log10(systemTemperature)

            // console.log("----------Antenna---------------");
            // console.log("Antenna Temp: " + antennaTemperature + " K");
            // console.log("System Temp: " + systemTemperature + " K");
            // console.log("Ant Gain: " + rxGain + "dBi");

            return antGt
        }

    }

    printLocation () {
        return `${this.location.lat}, ${this.location.lon}`
    }

    async seekContourAndCoordinates (transponder) {
        console.log(`Finding contour of station with location ${this.printLocation()}, for Transponder ${transponder.name}-${transponder.type} `)
        if (this.location.type === 'definedContours' || this.location.type === 'maxContour') {
            let contourValue = this.location.name.replace('%', '').toLocaleLowerCase() // Remove % signs from 50% value and transform EOC to eoc

            if (contourValue === 'eoc-2') {
                this.contour = transponder[`contour_eoc`] - 2
            } else if (contourValue === 'peak') {
                this.contour = 0
            } else if (contourValue === 'maxContour') {
                // do nothing here
            } else {
                this.contour = transponder[`contour_${contourValue}`]
            }
            this.setLatLon(transponder)
        }
        // If lat,lon is already given, seek the contour from the given transponder
        else if (this.location.lat && this.location.lon) {
            try {
                let contour = await Contour.getContour({
                    location: this.location,
                    satellite: transponder.satellite,
                    beam: transponder.name,
                    path: transponder.type,
                    parameter: transponder.type === 'forward' ? 'eirp' : 'gt'
                })
                this.contour = contour.properties.relativeGain
                console.log(JSON.stringify(contour))
            } catch (e) {
                console.log(e)
            }

        }
    }

    setLatLon (transponder) {
        // Set lat/lon
        this.location.lat = transponder.lat
        this.location.lon = transponder.lon
    }

    setTransponder(path, transponder) {
        this[`${path}Transponder`] = new Transponder(transponder)
    }


    static get ifl () {
        return 0.3
    }

    static get lnaNoise () {
        return 60
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