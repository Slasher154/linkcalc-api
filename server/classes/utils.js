/**
 * Created by thanatv on 11/9/17.
 */

class Utils {
    constructor (transponderObject) {
        for (var field in transponderObject) {
            this[field] = transponderObject[field]
        }
        this.init()
    }

    static carrierOverNoise(eirp, gt, pathLoss, noise_bandwidth) {
        // EIRP in dBW, G/T in dB/K, path loss in dB, bandwidth in MHz
        return eirp + gt - pathLoss - k - 10 * log10(noise_bandwidth * Math.pow(10, 6));
    }

    static cnOperation() {
        // 10*LOG(1/(1/(10^(B30/10))+1/(10^(B31/10))+1/(10^(B32/10))+1/(10^(B33/10))+1/(10^(B34/10))+1/(10^(B35/10))))
        var cn = arguments[0];
        var result = 0;
        for (var i = 0; i < arguments.length; i++) {
            result += 1 / (Math.pow(10, arguments[i] / 10));
        }
        return 10 * Utils.log10(1 / result);
    }

    static lambda(freq) {
        let c_light = 3 * Math.pow(10, 8);
        return  c_light / (freq * Math.pow(10, 9));
    }

    static linearInterpolation(x, x1, x2, fx1, fx2) {
        return ((fx2 - fx1) / (x2 - x1)) * (x - x1) + fx1;
    }

    static log10(num) {
        return Math.log(num) / Math.LN10;
    }

    // Return path loss in dB
    static pathLoss(range, freq) {
        return spreadingLoss(range) + gain1m(freq);
    }

    // Return pointing loss in dB
    static pointingLoss(freq, size, skw) {

        let c_light = 3 * Math.pow(10, 8);

        if (size === 8.1) {
            return 0.6;
        }
        else if (size <= 4.5) {
            //calculate pointing loss of an earth station with fixed pointing
            //Inputs
            //   freq = frequency of interest in GHz
            //   diam = antenna diameter in meter
            //   skw = half station keeping box of the satellite
            //Output
            //   pointing error in dB
            //Assumptions
            //   Fixed Antenna: Diam <= 4.5m
            //       0.15 of Half Power Beam Width as initial pointing error
            //       Affected by station keeping box
            //   Tracking Antenna: Diam > 4.5m
            //       Tracking capability is good within 0.035 degree of nominal boresight

            return 12 * Math.pow((0.15 + Math.sqrt(2) * skw * (freq * Math.pow(10, 9)) * size / (70 * c_light)), 2);

        }
        else {
            return 12 * Math.pow((0.035 * (freq * Math.pow(10, 9)) * size / (70 * c_light)), 2);
        }

    }

    static slantRange(location, sat_lon) {
        // Constants
        let degrees_to_radians = Math.PI / 180;
        let equatorial_earth_radius = 6378144;  // Equatorial Earth Radius in meters; changed from 6378159.9
        let geo_altitude_radius = 42164500;  // Radius at Geosynchronous Altitude; changed from 42166454
        let earth_oblateness = 1 / 298.257;  // Earth Oblateness

        // Calculates basic parameters
        let es_lat = location.lat;
        let es_lon = location.lon;
        let dif_lon = es_lon - sat_lon;
        let x_1 = equatorial_earth_radius * Math.cos(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        let x_2 = geo_altitude_radius * Math.cos(dif_lon * degrees_to_radians);
        let y_2 = geo_altitude_radius * Math.sin(dif_lon * degrees_to_radians);
        let z_1 = Math.pow((1 - earth_oblateness), 2) * equatorial_earth_radius * Math.sin(es_lat * degrees_to_radians) / Math.sqrt(1 - (2 - earth_oblateness) * earth_oblateness * Math.pow(Math.sin(es_lat * degrees_to_radians), 2));
        return Math.sqrt(Math.pow((x_2 - x_1), 2) + Math.pow(y_2, 2) + Math.pow(z_1, 2)) / 1000;
    }

    static spreadingLoss(range) {
        return 10 * this.log10(4 * Math.PI * Math.pow(range * 1000, 2));
    }

    static symbolRate(occupied_bandwidth, app) {
        if(app.name=="TOLL"){
            return occupied_bandwidth - 3.375;
        }
        return occupied_bandwidth / roll_off_factor;
    }

    static totalAvailability(up_avail, up_diversity, down_avail, down_diversity) {

        // find total uplink availability
        var total_up_avail = up_avail;

        // if there is uplink diversity input
        if (up_diversity) {
            total_up_avail = two_sites_avail(up_avail, up_diversity);
        }

        // find total downlink availability
        var total_down_avail = down_avail;

        // if there is downlink diversity input
        if (down_diversity) {
            total_down_avail = two_sites_avail(down_avail, down_diversity);
        }

        // combine up and down together
        return (total_up_avail * total_down_avail) / 100;

        function two_sites_avail(one_site_avail, diversity) {
            var single_site_unavail = 100 - one_site_avail;
            var beta_factor_square = (0.0001) * Math.pow(diversity.distance_from_main, 1.33);
            var two_site_unavail = single_site_unavail / (1 + 100 * beta_factor_square / single_site_unavail);
            return 100 - two_site_unavail;
        }
    }

    static xpolLoss() {
        return 0.1;
    }


}

module.exports = Utils