/**
 * Created by thanatv on 11/9/17.
 */

const Utils = require('./utils')

class Atmospheric {
    constructor (data) {
        
    }
    
    static calculateLoss (data) {
        let ele_angle = elevationAngle(data.location, data.orbital_slot);
        let gas = this.gasAtten(data.freq, ele_angle);
        let cloud = this.cloudAtten(data.freq, ele_angle);
        let scin = this.scinAtten(data.freq, ele_angle, data.diameter, data.availability);
        console.log("-------------Attenuation-----------");
        console.log("Elevation angle: " + ele_angle + " deg");
        console.log("Gas Atten: " + gas + " dB");
        console.log("Cloud Atten: " + cloud + " dB");
        console.log("Scin Atten: " + scin + " dB");
        if (data.condition === "clear") {

            if (ele_angle > 10) {
                return gas + cloud;
            }
            else {
                return gas + Math.sqrt(Math.pow(cloud, 2) + Math.pow(scin, 2));
            }
        }
        else {
            let rain = this.rainAtten(data.location, data.freq, data.orbital_slot, data.polarization, data.availability);
            console.log("Rain Atten: " + rain + " dB");
            return gas + Math.sqrt(Math.pow((rain + cloud), 2) + Math.pow(scin, 2));
        }
    }

    cloudAtten (freq, elevation) {
        // Calculate attenuation due to cloud for any frequency up to 1000GHz.
        // Assumption is used for temperature of 0 degree C (273K) as recommended in ITU-R P.840-3 (1999)
        // The calculation is based on the worst case normalized total columnar content of cloud liquid water exceeded
        // for 1% of the year which is estimated to 2Kg/m**2

        // TODO: Correct function for New Zealand

        var l1pct = 2;
        var theta = 300 / 273.0;
        var fp = 20.09 - 142 * (theta - 1) + 294 * Math.pow((theta - 1), 2);
        var fs = 590 - 1500 * (theta - 1);
        var ep0 = 77.6 + 103.3 * (theta - 1);
        var ep1 = 5.48;
        var ep2 = 3.51;
        var ep_p = ((ep0 - ep1) / (1 + Math.pow((freq / fp), 2))) + ((ep1 - ep2) / (1 + Math.pow((freq / fs), 2))) + ep2;
        var ep_pp = (freq * (ep0 - ep1) / (fp * (1 + Math.pow((freq / fp), 2)))) + (freq * (ep1 - ep2) / (fs * (1 + Math.pow((freq / fs), 2))));
        var nue = (2 + ep_p) / ep_pp;
        var kl = 0.819 * freq / (ep_pp * (1 + Math.pow(nue, 2)));

        //console.log('fp = ' + fp);
        //console.log('fs = ' + fs);
        //console.log('ep0 = ' + ep0);
        //console.log('ep2 = ' + ep2);
        //console.log('ep_p = ' + ep_p);
        //console.log('ep_pp = ' + ep_pp);
        //console.log('nue = ' + nue);
        //console.log('kl = ' + kl);
        var cloud = l1pct * kl / (Math.sin(elevation * Math.PI / 180));
        //console.log('cloud atten = ' + cloud);

        // This is valid for elevation angle from 5 degree to 90 degree
        return l1pct * kl / (Math.sin(elevation * Math.PI / 180));
    }

    gasAtten (freq, elevation) {
        // This function estimates the attenuation due to atmospheric gases per ITU rec. 676
        // Application is valid for frequency 54GHz and lower
        // Modified according to ITU-R P.676-3 , March 16, 1999
        //
        // Freq= Frequency in GHz
        // Temp_surf = surface temperature in degrees C
        // Relative Humidity at site (%)
        // Ele = Elevation angle in degrees
        // Station height, Hs of 0Km (sea level) is assumed for conservative estimate

        // TODO: Correct function for New Zealand

        // Saturated Partial pressure of water vapor
        var surface_temp = 27;
        var humidity = 99;
        var ps = 206.43 * Math.exp(0.0354 * ((9.0 * surface_temp / 5) + 32));
        var rho = (humidity / 100.0) * ps / (0.461 * (surface_temp + 273));

        //console.log('Surface temp: ' + surface_temp);
        //console.log('ps = ' + ps);
        //console.log('rho = ' + rho);

        // Specific attenuation for dry air for altitude up to 5Km
        var hpa = 1013.0;  // dry air pressure in hPa at sea level
        var r_t = 288 / (273.0 + surface_temp);
        var r_p = hpa / 1013;
        var nue_1 = 6.7665 * (Math.pow(r_p, -0.505)) * (Math.pow(r_t, 0.5106)) * Math.exp(1.5663 * (1 - r_t)) - 1;
        var nue_2 = 27.8843 * (Math.pow(r_p, -0.4908)) * (Math.pow(r_t, -0.8491)) * Math.exp(0.5496 * (1 - r_t)) - 1;
        var a_fact = Math.log(nue_2 / nue_1) / Math.log(3.5);
        var b_fact = Math.pow(4, a_fact) / nue_1;
        var gamma_op54 = 2.128 * Math.pow(r_p, 1.4954) * Math.pow(r_t, -1.6032) * Math.exp(-2.528 * (1 - r_t));
        var gamma_o = ((7.34 * Math.pow(r_p, 2) * Math.pow(r_t, 2) / (Math.pow(freq, 2) + 0.36 * Math.pow(r_p, 2) * Math.pow(r_t, 2))) + (0.3429 * b_fact * gamma_op54 / (Math.pow((54 - freq), a_fact) + b_fact))) * Math.pow(freq, 2) * Math.pow(10, -3);

        //console.log('r_t = ' + r_t);
        //console.log('r_p = ' + r_p);
        //console.log('nue_1 = ' + nue_1);
        //console.log('nue_2 = ' + nue_2);
        //console.log('a_fact = ' + a_fact);
        //console.log('b_fact = ' + b_fact);
        //console.log('gamma_op54 = ' + gamma_op54);
        //console.log('gamm_o = ' + gamma_o);

        // Specific attenuation for water vapour
        var sw1 = 0.9544 * r_p * Math.pow(r_t, 0.69) + 0.0061 * rho;
        var sw2 = 0.95 * r_p * Math.pow(r_t, 0.64) + 0.0067 * rho;
        var sw3 = 0.9561 * r_p * Math.pow(r_t, 0.67) + 0.0059 * rho;
        var sw4 = 0.9543 * r_p * Math.pow(r_t, 0.68) + 0.0061 * rho;
        var sw5 = 0.955 * r_p * Math.pow(r_t, 0.68) + 0.006 * rho;
        var g22 = 1 + Math.pow((freq - 22.235), 2) / Math.pow((freq + 22.235), 2);
        var g557 = 1 + Math.pow((freq - 557), 2) / Math.pow((freq + 557), 2);
        var g752 = 1 + Math.pow((freq - 752), 2) / Math.pow((freq + 752), 2);
        var tm1 = 3.84 * sw1 * g22 * Math.exp(2.23 * (1 - r_t)) / (Math.pow((freq - 22.235), 2) + 9.42 * Math.pow(sw1, 2));
        var tm2 = 10.48 * sw2 * Math.exp(0.7 * (1 - r_t)) / (Math.pow((freq - 183.31), 2) + 9.48 * Math.pow(sw2, 2));
        var tm3 = 0.78 * sw3 * Math.exp(6.4385 * (1 - r_t)) / (Math.pow((freq - 321.226), 2) + 6.29 * Math.pow(sw3, 2));
        var tm4 = 3.76 * sw4 * Math.exp(1.6 * (1 - r_t)) / (Math.pow((freq - 325.153), 2) + 9.22 * Math.pow(sw4, 2));
        var tm5 = 26.36 * sw5 * Math.exp(1.09 * (1 - r_t)) / Math.pow((freq - 380), 2);
        var tm6 = 17.87 * sw5 * Math.exp(1.46 * (1 - r_t)) / Math.pow((freq - 448), 2);
        var tm7 = 883.7 * sw5 * g557 * Math.exp(0.17 * (1 - r_t)) / Math.pow((freq - 557), 2);
        var tm8 = 302.6 * sw5 * g752 * Math.exp(0.41 * (1 - r_t)) / Math.pow((freq - 752), 2);
        var sum_tm = tm1 + tm2 + tm3 + tm4 + tm5 + tm6 + tm7 + tm8;

        //console.log('sw1 = ' + sw1 + ' sw2 = ' + sw2 + ' sw3 = ' + sw3);
        //console.log('sw4 = ' + sw4 + ' sw5 = ' + sw5);
        //console.log('g22 = ' + g22 + ' g557 = ' + g557 + ' g752 = ' + g752);
        //console.log('tm1 = ' + tm1 + ' tm2 = ' + tm2 + ' tm3 = ' + tm3);
        //console.log('tm4 = ' + tm4 + ' tm5 = ' + tm5 + ' tm6 = ' + tm6);
        //console.log('tm7 = ' + tm7 + ' tm8 = ' + tm8);
        //console.log('sum_tm = ' + sum_tm);


        var gamma_w = (0.0313 * r_p * Math.pow(r_t, 2) + 0.00176 * rho * Math.pow(r_t, 8.5) + Math.pow(r_t, 2.5) * sum_tm) * Math.pow(freq, 2) * rho * Math.pow(10, -4);

        // Station height = Sea level is assumed
        var hs = 0;

        // Dry air equivalent height for freq from 1GHz to 56.7GHz
        var ho = 5.386 - 0.0332734 * freq + 0.00187185 * Math.pow(freq, 2) - 3.52087 * Math.pow(10, -5) * Math.pow(freq, 3) + 83.26 / ((Math.pow((freq - 60), 2)) + 1.2);

        // Water vapor equivalent height
        var hw = 1.65 * (1 + (1.61 / ((Math.pow((freq - 22.23), 2)) + 2.91)) + (3.33 / (Math.pow((freq - 183.3), 2) + 4.58)) + (1.9 / (Math.pow((freq - 325.1), 2) + 3.34)));

        //console.log('gamma_w =' + gamma_w);
        //console.log('hw = ' + hw);

        if (elevation > 10) {
            return (gamma_o * ho + gamma_w * hw) / Math.sin(elevation * Math.PI / 180);
        }
        else {
            var sin_elevation = Math.sin(elevation * Math.PI / 180);
            var gho = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (ho / 8500));
            var ghw = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (hw / 8500));
            return (gamma_o * ho / gho) + (gamma_w * hw / ghw);
        }
    }

    scinAtten (freq, elevation, diameter, availability) {
        // Calculate attenuation due to scintillation effect based on ITU-R P.618-6 for elevation angle > 4deg
        // Input
        // temp=average surface ambient temperature in degree C
        // humidity=average surface relative humidity in %
        // freq=carrier frequency in GHz (>4GHz and <20GHz)
        // Ele=Elevation angle
        // diam=diameter of antenna in m
        // eff=antenna efficiency in fraction (typical =0.5 to be conservative)
        // press=atmospheric pressure at the site, 1atm = 1,013.25hPa
        // avail=availability in %

        var temp = 27; // surface temp
        var humidity = 99;
        var eff = 0.6;
        var press = 1; // atmospheric pressure

        // Step-1: Calculate saturation water vapour pressure (Es)
        var a = 6.1121;
        var b = 17.502;
        var c = 240.97;
        var es = a * Math.exp(b * temp / (temp + c));
        //console.log('es = ' + es);

        // Step-2: Calculates radio refractivity, Nwet
        var eh = humidity * es / 100.0;
        var nwet = 77.6 * ((press * 1013.25) + (4810.0 * eh / (273.0 + temp))) / (273 + temp);
        //console.log('eh = ' + eh + ' nwet = ' + nwet);

        // Step-3: Calculate standard deviation of signal amplitude, sigma_ref
        var sigma_ref = 3.6 * Math.pow(10, -3) + nwet * Math.pow(10, -4);
        //console.log('sigma_ref = ' + sigma_ref);

        // Step-4: Calculate effective path length
        // hL=height of turbulent layer = 1000m
        var hl = 1000;
        var sin_elevation = Math.sin(elevation * Math.PI / 180);
        var length = 2 * hl / (Math.sqrt(Math.pow(sin_elevation, 2) + (2.35 * Math.pow(10, -4))) + sin_elevation);
        //console.log('sin_elev = ' + sin_elevation + ' length = ' + length);

        // Step-5: estimate effective antenna diameter
        var deff = Math.sqrt(eff) * diameter;
        //console.log('deff = ' + deff);

        // Step-6: Calculate antenna averaging factor.
        var x_val = 1.22 * (freq / length) * Math.pow(deff, 2);
        var gx = Math.sqrt((3.86 * Math.pow((Math.pow(x_val, 2) + 1), (11.0 / 12))) * Math.sin((11.0 / 6) * Math.atan(1 / x_val)) - (7.08 * Math.pow(x_val, (5.0 / 6))));
        //console.log('x_val =' + x_val + ' gx = ' + gx);

        // Step-7: Calculate standard deviation
        var sigma = sigma_ref * Math.pow(freq, (7 / 12.0)) * gx / Math.pow(sin_elevation, 1.2);
        //console.log('sigma = ' + sigma);

        // Step-8: Calculate time percentage factor for the value of unavailability
        var unavailability = 100 - availability;
        var a_p = -0.061 * Math.pow(Utils.log10(unavailability), 3) + 0.072 * Math.pow(Utils.log10(unavailability), 2) - 1.71 * Utils.log10(unavailability) + 3;
        //console.log('unavailability = ' + unavailability);
        //console.log('a_p = ' + a_p);

        // Step-9: Calculation scintillation fade depth
        return a_p * sigma;
    }

    rainAtten001 (location, freq, orbital_slot, polarization, availability) {
        //  ITU rain attenuation model
        //  based on Rec. ITU-R 618-6, 1999
        //  Modification to allow for all elevation angles, frequencies between 1 and 55GHz,
        //  probabilities between 0.001% and 5% of an average year
        //
        // Inputs
        // variable:format:Infor: range
        // R_one_hundreth: Rainfall rate in mm/hr as obtain from digital map table in ITU-R P.837-2
        // polarization: String : wave:"V","H","C"
        // stat_height: Number  : Station  height above mean sea level in km: 0 to ~ N
        // stat_lat:Number: Math.absolute value of Latitude of earth station in deg: (0 - 81.3 degrees)
        // stat_lon: Longitude of earth station in East longtitude
        // freq : Number : Frequency in GHz: Range is 1 GHz to 55 GHz
        // el_angle: Number: Earth Station antenna elevation angle in deg.  (0 - 90)
        // availability: Number:Desired link availability: i.e., 99.5,  (min. value is 95., max 99.999)

        // Output/Return value is the attenuation in dB.

        // Inputs range check
        // Check availability (smallest allowed value will be 95., Max will be 99.999)

        // Set up format of basic parameters used several times
        //  equivalent elevation angle in radians - Excel functions operate in radians

        var stat_lat = location.lat;
        var stat_lon = location.lon;
        var ele_angle = elevationAngle(location, orbital_slot);
        var ele_rad = ele_angle * Math.PI / 180
        var stat_height = 0

        // Rainfall rate in mm/hr as obtain from digital map table in ITU-R P.837-2
        var r_100;

        // Meteor.apply('get_rain_points', [stat_lat, stat_lon], {wait: true}, function (error, value) {
        //     console.log('-------------------Get rain points is called -----------')
        //     if (error) {
        //         logError(error.reason);
        //         return false;
        //     }
        //     else {
        //         console.log('Rain rate = ' + value);
        //         r_100 = value;
        //     }
        // });
        // check if lat,lon is valid
        if (stat_lat > 90 || stat_lat < -90 || stat_lon > 180 || stat_lon < -180) {
            throw new Meteor.Error(422, 'Lat/Lon is not valid.');
        }
        // the database grid contains lat/lon at 1.5 degree step, so find the 2 lat and 2 lons which are closest to the given point
        var x_lat = Math.floor(stat_lat / 1.5);
        var x_lon = Math.floor(stat_lon / 1.5);
        var y1 = x_lat * 1.5;
        var y2 = (x_lat + 1) * 1.5;
        var x1 = x_lon * 1.5;
        var x2 = (x_lon + 1) * 1.5;
        console.log(y1 + " , " + y2 + " , " + x1 + " , " + x2);
        var f12 = RainData.findOne({lat: y2, lon: x1}).value;
        var f22 = RainData.findOne({lat: y2, lon: x2}).value;
        var f11 = RainData.findOne({lat: y1, lon: x1}).value;
        var f21 = RainData.findOne({lat: y1, lon: x2}).value;

        // Perform bi-linear interpolation
        // Source: http://en.wikipedia.org/wiki/Bilinear_interpolation

        // Linear interpolation in the x-axis for both y
        var fxy1 = linearInterpolation(stat_lon, x1, x2, f11, f21);
        var fxy2 = linearInterpolation(stat_lon, x1, x2, f12, f22);

        // Linear interpolation fxy1,fxy2 in the y-axis
        var rain = linearInterpolation(stat_lat, y1, y2, fxy1, fxy2);

        console.log('topLeft = ' + f12 + ' topRight = ' + f22 + ' bottomLeft = ' + f11 + ' bottomRight = ' + f21);
        console.log('Rain 001 inside rainAtten001 function = ' + rain);
        r_100 = rain;


        // unavailability, (100 percent - given availability)
        var unavailability = 100 - availability;

        // __________________________________________________________
        // First Step of algorithm is to calculate the Isotherm height for the rain : km
        // i.e., height at which rain is at 0 deg C
        //
        // Step-1:
        var rain_height = 0;
        if (stat_lat > 23) // Northern Hemisphere
        // if (stat_lon < 60) Or (stat_lon > 200) Then // for North America and Europe
        // if (stat_lat >= 35) And (stat_lat <= 70) Then // As modified by ITU-R P.839-2
        // rain_height = 3.2 - 0.075 * (stat_lat - 35)
            rain_height = 5 - 0.075 * (stat_lat - 23);
        else if (0 < stat_lat <= 23) {  // Northern Hemisphere
            rain_height = 5;
        }
        else if (-21 < stat_lat <= 0) {  // Southern Hemisphere
            rain_height = 5;
        }
        else if (-71 < stat_lat <= 21) {  // Southern Hemisphere
            rain_height = 5 + 0.1 * (stat_lat + 21);
        }
        else {
            rain_height = 0;
        }

        // Next determine the slant path length to isotherm, this is the Ls in the ITU Rec
        //  Note the value of 8500 is the earth radius in km
        // Step-2:
        var slant_path;
        if (ele_angle >= 5) {
            slant_path = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        else {
            //  very low elevation angles
            slant_path = 2 * (rain_height - stat_height) / (Math.sqrt(Math.pow(Math.sin(ele_rad), 2) + 2 * (rain_height - stat_height) / 8500) + Math.sin(ele_rad));
        }
        // Determine horizontal projection to ground of slant path length.  (this is the LG in the ITU REC)
        // Step-3:
        var horizontal_slant_path = slant_path * Math.cos(ele_rad);

        //  Now determine the Rain Point intensity (mm/hr)for an exceed of 0.01: R_one_hundreth
        //  select value for selected rain region
        //  only one of the .01  rates are  used (based on the rain region)
        //  Values taken from ITU-R, Rec 837-1, 1994
        // Step-4:
        // R_one_hundreth is obtained from ITU-R P.837 as is passed to this function
        // Use routine RR_001 to get this value

        //  Now find the k and alpha factor per ITU-R  Rec.838
        // Step-5:  ITU-R P.838 dated 15 March 1999 stated that the matrix is good up to 55GHz
        // array of frequencies 1 to 400 GHz, used to specify an index value for k and alpha
        var freq_array = [1, 2, 4, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200,
            300, 400];

        // the following are arrays of specific values for kh, kv, alphah, and alphav.
        // they are used for interpolating when calculating actual values k_H, k_V,
        // alpha_H, and alpha_V.
        var kh = [0.0000387, 0.000154, 0.00065, 0.00175, 0.00301, 0.00454, 0.0101, 0.0188, 0.0367, 0.0751, 0.124, 0.187,
            0.263, 0.35, 0.442, 0.536, 0.707, 0.851, 0.975, 1.06, 1.12, 1.18, 1.31, 1.45, 1.36, 1.32];

        var kv = [0.0000352, 0.000138, 0.000591, 0.00155, 0.00265, 0.00395, 0.00887, 0.0168, 0.0335, 0.0691, 0.113, 0.167,
            0.233, 0.31, 0.393, 0.479, 0.642, 0.784, 0.906, 0.999, 1.06, 1.13, 1.27, 1.42, 1.35, 1.31];

        var alphah = [0.912, 0.963, 1.121, 1.308, 1.332, 1.327, 1.276, 1.217, 1.154, 1.099, 1.061, 1.021, 0.979, 0.939,
            0.903, 0.873, 0.826, 0.793, 0.769, 0.753, 0.743, 0.731, 0.71, 0.689, 0.688, 0.683];

        var alphav = [0.88, 0.923, 1.075, 1.265, 1.312, 1.31, 1.264, 1.2, 1.128, 1.065, 1.03, 1, 0.963, 0.929, 0.897, 0.868,
            0.824];

        //  find index for frequency within the frequency array
        var match = this.excelMatch(freq_array, freq);
        var freq1 = match.x1;
        var freq2 = match.x2;

        //  interpolate to find the values for k_H and K_V .: Log (K_x)vs LOG(freq)
        var x1 = Utils.log10(freq_array[freq1]);
        var x2 = Utils.log10(freq_array[freq2]);
        var x3 = Utils.log10(freq);
        var y1 = Utils.log10(kh[freq1]);
        var y2 = Utils.log10(kh[freq2]);

        var k_H = Math.pow(10, (y1 - (x3 - x1) * (y1 - y2) / (x2 - x1)));

        var y1 = Utils.log10(kv[freq1]);
        var y2 = Utils.log10(kv[freq2]);

        var k_v = Math.pow(10, (y1 - (x3 - x1) * (y1 - y2) / (x2 - x1)));

        // Interpolate to find the valued for alpha_H and alpha_V : Alpha_x vs log (freq)
        var y1 = alphah[freq1];
        var y2 = alphah[freq2];

        var alpha_H = y1 - (x3 - x1) * (y1 - y2) / (x2 - x1);

        var y1 = alphav[freq1];
        var y2 = alphav[freq2];

        var alpha_v = y1 - (x3 - x1) * (y1 - y2) / (x2 - x1);

        var tau = tau_value(polarization);

        // calculate the factor k
        var k = (k_H + k_v + (k_H - k_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / 2;

        // calculate the factor alpha
        var alpha = (k_H * alpha_H + k_v * alpha_v + (k_H * alpha_H - k_v * alpha_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / (2 * k);

        // specific attenuation from frequency-dependent coefficients (dB/km)
        var gamma_r = k * Math.pow(r_100, alpha);

        // Step-6:
        // Calculate the horizontal reduction factor,r0.01, for 0.01% of the time
        var red_factor = 1 / (1 + 0.78 * Math.sqrt(horizontal_slant_path * gamma_r / freq) - 0.38 * (1 - Math.exp(-2 * horizontal_slant_path)));

        // Step-7:
        // Calculate the vertical adjustment factor,V_001,fro 0.01% of the time
        var gamma_n = Math.atan((rain_height - stat_height) / (horizontal_slant_path * red_factor)) * (180 / Math.PI);
        var l_r;
        if (gamma_n > ele_angle) {
            l_r = horizontal_slant_path * red_factor / Math.cos(ele_rad);
        }
        else {
            l_r = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        var Qhi;
        if (Math.abs(stat_lat) < 36) {
            Qhi = 36 - Math.abs(stat_lat);
        }
        else {
            Qhi = 0;
        }
        var v_001 = 1 / (1 + Math.sqrt(Math.sin(ele_rad)) * ((31 * (1 - Math.exp(-ele_angle / (1 + Qhi))) * Math.sqrt(l_r * gamma_r) / Math.pow(freq, 2)) - 0.45));
        //  V_001 = 1 / (1 + sqrt(Math.sin(ele_rad)) * ((31 * (1 - exp(-1 * (El_angle / (1 + Qhi)))) * sqrt(L_R * gamma_R) / (freq ** 2)) - 0.45))

        // Step-8:
        // Calculate the effective path length, L_E
        var eff_path_length = l_r * v_001;

        // Step-9:
        // Calculate the predicted attenuation exceeded for .01% of an average year
        return gamma_r * eff_path_length
    }

    // Calculates rain attenuation from predicted attenuation exceeded for 0.01% of an average year
    rainAtten(location, freq, orbital_slot, polarization, availability) {
        // Calculate the estimated attenuation to be exceeded for other percentages of an average year
        // in the range of .001% to 5%  is approximated by
        var unavailability = 100 - availability;
        var stat_lat = location.lat;
        var ele_angle = elevationAngle(location, orbital_slot);
        var ele_rad = ele_angle * Math.PI / 180;
        var rain_001 = this.rainAtten001(location, freq, orbital_slot, polarization, availability);
        var beta;
        if (unavailability >= 1 || Math.abs(stat_lat) >= 36) {
            beta = 0;
        }
        else if (unavailability < 1 && Math.abs(stat_lat) < 36 && ele_angle >= 25) {
            beta = -0.005 * (Math.abs(stat_lat) - 36);
        }
    
        else {
            beta = -0.005 * (Math.abs(stat_lat) - 36) + 1.8 - 4.25 * Math.sin(ele_rad);
        }
        console.log('Beta = ' + beta);
        console.log('Rain 001 =' + rain_001);
        console.log('Unavailability = ' + unavailability);
        console.log('Ele_rad = ' + ele_rad);
        return rain_001 * Math.pow((unavailability / 0.01), -(0.655 + 0.033 * Math.log(unavailability) - 0.045 * Math.log(rain_001) - beta * (1 - unavailability) * Math.sin(ele_rad)));
    
    }

    excelMatch(arr, value) {
        var obj = {};
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] > value) {
                obj.x1 = i - 1;
                obj.x2 = i;
                break;
            }
        }
        return obj;
    }
    
}

module.exports = Atmospheric