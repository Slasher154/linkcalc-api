/**
 * Created by thanatv on 11/3/17.
 */

const Utils = require('./utils')

class Antenna {
    constructor (antennaObject) {
        for (var field in antennaObject) {
            this[field] = antennaObject[field]
        }
    }

    // Calculate antenna gain from normal formula from given diameter (m) and frequency (GHz)
   gain (freq, path) {
        var eff = 0.6 // Assume antenna efficiency to be 60%

        // Check if this antenna already has the property tx_gain that user inputs when antenna is created
        // tx_gain is used when the gain value is from brochure (not use normal antenna gain formula)
        if (this[path + '_gain']) {
            return this.gainAtFrequency(freq, path)
        }
        return 10 * Utils.log10(eff * Math.pow(Math.PI * this.size / Utils.lambda(freq), 2));
    }


    gainAtFrequency(freq ,path) {
        // derives the equation to get this antenna efficiency
        let eff = Math.pow(10, this[path+'_gain'][value] / 10) / Math.pow((this.size / Utils.lambda(this[path+'_gain'][freq]) * Math.PI), 2);
        return 10 * Utils.log10(eff * Math.pow(Math.PI * this.size / Utils.lambda(freq), 2));
    }

    rxGain(freq) {
        return this.gain(freq, 'rx')
    }

    txGain(freq) {
        return this.gain(freq, 'tx')
    }

    static calculateGain(diameter, freq) {
        var eff = 0.6 // Assume antenna efficiency to be 60%
        return 10 * Utils.log10(eff * Math.pow(Math.PI * diameter / lambda(freq), 2));
    }

    static temp (attenuation, condition) {
        if(condition == "clear"){
            return 30;
        }
        else if(condition == "rain"){
            var tc = 2.7 // background sky noise due to cosmic radiation = 2.7K
            return 260 * (1 - Math.pow(10, -(attenuation / 10))) + tc * Math.pow(10, -(attenuation / 10));
        }
        return 30;
    }

}

module.exports = Antenna