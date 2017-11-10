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
        if (path && this[path + '_gain']) {
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

    gainImprovment(deg_diff){
        console.log('find gain improve of size = ' + this.size + ' diff = ' + deg_diff);
        var gain_improvement = 0;
        var gain_improvement_obj = this.gainImprovementValues().find(g => g.size === this.size);
        if(gain_improvement_obj){
            var gain_data = gain_improvement_obj.data;
            console.log('Gain data = ' + JSON.stringify(gain_data));
            // the object with minimum degrees which is more than our degree diff
            var min_data = _.min(_.filter(gain_data,function(item2){ return item2.degrees > deg_diff}), function(item){return item.degrees;});
            console.log('Min data = ' + JSON.stringify(min_data));
            // the object with maximum degrees which is less than our degree diff
            var max_data = _.max(_.filter(gain_data,function(item2){ return item2.degrees < deg_diff}), function(item){return item.degrees;});
            console.log('Max data = ' + JSON.stringify(max_data));
            if(deg_diff < max_data.degrees){
                // do nothing
            }
            else if(deg_diff > min_data.degrees){
                gain_improvement = min_data.value;
            }
            else{
                gain_improvement = Utils.linearInterpolation(deg_diff,min_data.degrees, max_data.degrees, min_data.value, max_data.value);
            }
        }
    
        return gain_improvement;
    }

    gainImprovementValues () {
        return [
        {
            "_id" : "LWvNmsYL8bPnPTaxc",
            "size" : 1,
            "data" : [
            {
                "degrees" : 2.7,
                "value" : 3
            },
            {
                "degrees" : 3.5,
                "value" : 2.1
            },
            {
                "degrees" : 4.5,
                "value" : 2.1
            }
        ]
        },
        {
            "_id" : "NsnDHRvcWpBW2aMHm",
            "size" : 2.4,
            "data" : [
            {
                "degrees" : 2.7,
                "value" : 1.9
            },
            {
                "degrees" : 3.5,
                "value" : 3.1
            },
            {
                "degrees" : 4.5,
                "value" : 2.4
            }
        ]
        },
        {
            "_id" : "hZ8XmPMRrWDpkJLsv",
            "size" : 1.2,
            "data" : [
            {
                "degrees" : 2.7,
                "value" : 5.9
            },
            {
                "degrees" : 3.5,
                "value" : 7.6
            },
            {
                "degrees" : 4.5,
                "value" : 8.2
            }
        ]
        },
        {
            "_id" : "maLSFot3zL4m7v9MH",
            "size" : 1.8,
            "data" : [
            {
                "degrees" : 2.7,
                "value" : 5.4
            },
            {
                "degrees" : 3.5,
                "value" : 7.1
            },
            {
                "degrees" : 4.5,
                "value" : 6.6
            }
        ]
        },
        {
            "_id": "qf72yXQRyiXrWxrEW",
            "size": 0.84,
            "data":
            [
                {
                    "degrees": 2.7,
                    "value": 0
                },
                {
                    "degrees": 3.5,
                    "value": 6.4
                },
                {
                    "degrees": 4.5,
                    "value": 7.7
                }
            ]
        }
        ]
    }

    // Return Gain rejection ratio from given frequency, antenna size and degree difference
    // (Return Positive value)
    gainRejectionRatio(freq, degree_diff) {
        return this.gain(freq) - this.offAxisGain(freq, degree_diff);
    }

    // Return off-axis gain
    offAxisGain(freq, offset) {
        var gain_max = this.gain(freq);
    
        var theta_r = 95 * Utils.lambda(freq) / this.size;
        var g1 = 29 - 25 * Utils.log10(theta_r);
        var theta_m = Utils.lambda(freq) / this.size * Math.sqrt((gain_max - g1) / 0.0025);
        var theta_b = Math.pow(10, 34.0 / 25);
    
        var result = 0;
        var abs_offset = Math.abs(offset);
        if (abs_offset < theta_m) {
            result = gain_max - 0.0025 * Math.pow((this.size / Utils.lambda(freq) * offset), 2);
        }
        else if (abs_offset < theta_r) {
            result = g1;
        }
        else if (abs_offset < theta_b) {
            result = 29 - 25 * Utils.log10(abs_offset);
        }
        else if (abs_offset < 70) {
            result = -5;
        }
        else {
            result = 0;
        }
        return result;
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