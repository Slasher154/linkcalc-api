/**
 * Created by thanatv on 11/9/17.
 */

const Utils = require('./utils')
const {RainData} = require('../models/raindata');

class Atmospheric {
    constructor (data) {
        this.debugLevel = data.debugLevel || 5
    }
    
    async calculateLoss (data) {
        this.logMessage(data)
        let ele_angle = Utils.elevationAngle(data.location, data.orbitalSlot);
        let gas = this.gasAtten(data.freq, ele_angle);
        let cloud = this.cloudAtten(data.freq, ele_angle);
        let scin = this.scinAtten(data.freq, ele_angle, data.diameter, data.availability);
        this.logMessage("-------------Attenuation-----------");
        this.logMessage("Elevation angle: " + ele_angle + " deg");
        this.logMessage("Gas Atten: " + gas + " dB");
        this.logMessage("Cloud Atten: " + cloud + " dB");
        this.logMessage("Scin Atten: " + scin + " dB");
        if (data.condition === "clear") {

            if (ele_angle > 10) {
                return gas + cloud;
            }
            else {
                return gas + Math.sqrt(Math.pow(cloud, 2) + Math.pow(scin, 2));
            }
        }
        else {
            let rain = await this.rainAtten(data.location, data.freq, data.orbitalSlot, data.polarization, data.availability);
            this.logMessage("Rain Atten: " + rain + " dB");
            return gas + Math.sqrt(Math.pow((rain + cloud), 2) + Math.pow(scin, 2));
        }
    }

    cloudAtten (freq, elevation) {
        // Calculate attenuation due to cloud for any frequency up to 1000GHz.
        // Assumption is used for temperature of 0 degree C (273K) as recommended in ITU-R P.840-3 (1999)
        // The calculation is based on the worst case normalized total columnar content of cloud liquid water exceeded
        // for 1% of the year which is estimated to 2Kg/m**2

        // TODO: Correct function for New Zealand

        let l1pct = 2;
        let theta = 300 / 273.0;
        let fp = 20.09 - 142 * (theta - 1) + 294 * Math.pow((theta - 1), 2);
        let fs = 590 - 1500 * (theta - 1);
        let ep0 = 77.6 + 103.3 * (theta - 1);
        let ep1 = 5.48;
        let ep2 = 3.51;
        let ep_p = ((ep0 - ep1) / (1 + Math.pow((freq / fp), 2))) + ((ep1 - ep2) / (1 + Math.pow((freq / fs), 2))) + ep2;
        let ep_pp = (freq * (ep0 - ep1) / (fp * (1 + Math.pow((freq / fp), 2)))) + (freq * (ep1 - ep2) / (fs * (1 + Math.pow((freq / fs), 2))));
        let nue = (2 + ep_p) / ep_pp;
        let kl = 0.819 * freq / (ep_pp * (1 + Math.pow(nue, 2)));

        //this.logMessage('fp = ' + fp);
        //this.logMessage('fs = ' + fs);
        //this.logMessage('ep0 = ' + ep0);
        //this.logMessage('ep2 = ' + ep2);
        //this.logMessage('ep_p = ' + ep_p);
        //this.logMessage('ep_pp = ' + ep_pp);
        //this.logMessage('nue = ' + nue);
        //this.logMessage('kl = ' + kl);
        let cloud = l1pct * kl / (Math.sin(elevation * Math.PI / 180));
        //this.logMessage('cloud atten = ' + cloud);

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
        let surface_temp = 27;
        let humidity = 99;
        let ps = 206.43 * Math.exp(0.0354 * ((9.0 * surface_temp / 5) + 32));
        let rho = (humidity / 100.0) * ps / (0.461 * (surface_temp + 273));

        //this.logMessage('Surface temp: ' + surface_temp);
        //this.logMessage('ps = ' + ps);
        //this.logMessage('rho = ' + rho);

        // Specific attenuation for dry air for altitude up to 5Km
        let hpa = 1013.0;  // dry air pressure in hPa at sea level
        let r_t = 288 / (273.0 + surface_temp);
        let r_p = hpa / 1013;
        let nue_1 = 6.7665 * (Math.pow(r_p, -0.505)) * (Math.pow(r_t, 0.5106)) * Math.exp(1.5663 * (1 - r_t)) - 1;
        let nue_2 = 27.8843 * (Math.pow(r_p, -0.4908)) * (Math.pow(r_t, -0.8491)) * Math.exp(0.5496 * (1 - r_t)) - 1;
        let a_fact = Math.log(nue_2 / nue_1) / Math.log(3.5);
        let b_fact = Math.pow(4, a_fact) / nue_1;
        let gamma_op54 = 2.128 * Math.pow(r_p, 1.4954) * Math.pow(r_t, -1.6032) * Math.exp(-2.528 * (1 - r_t));
        let gamma_o = ((7.34 * Math.pow(r_p, 2) * Math.pow(r_t, 2) / (Math.pow(freq, 2) + 0.36 * Math.pow(r_p, 2) * Math.pow(r_t, 2))) + (0.3429 * b_fact * gamma_op54 / (Math.pow((54 - freq), a_fact) + b_fact))) * Math.pow(freq, 2) * Math.pow(10, -3);

        //this.logMessage('r_t = ' + r_t);
        //this.logMessage('r_p = ' + r_p);
        //this.logMessage('nue_1 = ' + nue_1);
        //this.logMessage('nue_2 = ' + nue_2);
        //this.logMessage('a_fact = ' + a_fact);
        //this.logMessage('b_fact = ' + b_fact);
        //this.logMessage('gamma_op54 = ' + gamma_op54);
        //this.logMessage('gamm_o = ' + gamma_o);

        // Specific attenuation for water vapour
        let sw1 = 0.9544 * r_p * Math.pow(r_t, 0.69) + 0.0061 * rho;
        let sw2 = 0.95 * r_p * Math.pow(r_t, 0.64) + 0.0067 * rho;
        let sw3 = 0.9561 * r_p * Math.pow(r_t, 0.67) + 0.0059 * rho;
        let sw4 = 0.9543 * r_p * Math.pow(r_t, 0.68) + 0.0061 * rho;
        let sw5 = 0.955 * r_p * Math.pow(r_t, 0.68) + 0.006 * rho;
        let g22 = 1 + Math.pow((freq - 22.235), 2) / Math.pow((freq + 22.235), 2);
        let g557 = 1 + Math.pow((freq - 557), 2) / Math.pow((freq + 557), 2);
        let g752 = 1 + Math.pow((freq - 752), 2) / Math.pow((freq + 752), 2);
        let tm1 = 3.84 * sw1 * g22 * Math.exp(2.23 * (1 - r_t)) / (Math.pow((freq - 22.235), 2) + 9.42 * Math.pow(sw1, 2));
        let tm2 = 10.48 * sw2 * Math.exp(0.7 * (1 - r_t)) / (Math.pow((freq - 183.31), 2) + 9.48 * Math.pow(sw2, 2));
        let tm3 = 0.78 * sw3 * Math.exp(6.4385 * (1 - r_t)) / (Math.pow((freq - 321.226), 2) + 6.29 * Math.pow(sw3, 2));
        let tm4 = 3.76 * sw4 * Math.exp(1.6 * (1 - r_t)) / (Math.pow((freq - 325.153), 2) + 9.22 * Math.pow(sw4, 2));
        let tm5 = 26.36 * sw5 * Math.exp(1.09 * (1 - r_t)) / Math.pow((freq - 380), 2);
        let tm6 = 17.87 * sw5 * Math.exp(1.46 * (1 - r_t)) / Math.pow((freq - 448), 2);
        let tm7 = 883.7 * sw5 * g557 * Math.exp(0.17 * (1 - r_t)) / Math.pow((freq - 557), 2);
        let tm8 = 302.6 * sw5 * g752 * Math.exp(0.41 * (1 - r_t)) / Math.pow((freq - 752), 2);
        let sum_tm = tm1 + tm2 + tm3 + tm4 + tm5 + tm6 + tm7 + tm8;

        //this.logMessage('sw1 = ' + sw1 + ' sw2 = ' + sw2 + ' sw3 = ' + sw3);
        //this.logMessage('sw4 = ' + sw4 + ' sw5 = ' + sw5);
        //this.logMessage('g22 = ' + g22 + ' g557 = ' + g557 + ' g752 = ' + g752);
        //this.logMessage('tm1 = ' + tm1 + ' tm2 = ' + tm2 + ' tm3 = ' + tm3);
        //this.logMessage('tm4 = ' + tm4 + ' tm5 = ' + tm5 + ' tm6 = ' + tm6);
        //this.logMessage('tm7 = ' + tm7 + ' tm8 = ' + tm8);
        //this.logMessage('sum_tm = ' + sum_tm);


        let gamma_w = (0.0313 * r_p * Math.pow(r_t, 2) + 0.00176 * rho * Math.pow(r_t, 8.5) + Math.pow(r_t, 2.5) * sum_tm) * Math.pow(freq, 2) * rho * Math.pow(10, -4);

        // Station height = Sea level is assumed
        let hs = 0;

        // Dry air equivalent height for freq from 1GHz to 56.7GHz
        let ho = 5.386 - 0.0332734 * freq + 0.00187185 * Math.pow(freq, 2) - 3.52087 * Math.pow(10, -5) * Math.pow(freq, 3) + 83.26 / ((Math.pow((freq - 60), 2)) + 1.2);

        // Water vapor equivalent height
        let hw = 1.65 * (1 + (1.61 / ((Math.pow((freq - 22.23), 2)) + 2.91)) + (3.33 / (Math.pow((freq - 183.3), 2) + 4.58)) + (1.9 / (Math.pow((freq - 325.1), 2) + 3.34)));

        //this.logMessage('gamma_w =' + gamma_w);
        //this.logMessage('hw = ' + hw);

        if (elevation > 10) {
            return (gamma_o * ho + gamma_w * hw) / Math.sin(elevation * Math.PI / 180);
        }
        else {
            let sin_elevation = Math.sin(elevation * Math.PI / 180);
            let gho = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (ho / 8500));
            let ghw = 0.661 * sin_elevation + 0.339 * Math.sqrt(Math.pow(sin_elevation, 2) + 5.5 * (hw / 8500));
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

        let temp = 27; // surface temp
        let humidity = 99;
        let eff = 0.6;
        let press = 1; // atmospheric pressure

        // Step-1: Calculate saturation water vapour pressure (Es)
        let a = 6.1121;
        let b = 17.502;
        let c = 240.97;
        let es = a * Math.exp(b * temp / (temp + c));
        //this.logMessage('es = ' + es);

        // Step-2: Calculates radio refractivity, Nwet
        let eh = humidity * es / 100.0;
        let nwet = 77.6 * ((press * 1013.25) + (4810.0 * eh / (273.0 + temp))) / (273 + temp);
        //this.logMessage('eh = ' + eh + ' nwet = ' + nwet);

        // Step-3: Calculate standard deviation of signal amplitude, sigma_ref
        let sigma_ref = 3.6 * Math.pow(10, -3) + nwet * Math.pow(10, -4);
        //this.logMessage('sigma_ref = ' + sigma_ref);

        // Step-4: Calculate effective path length
        // hL=height of turbulent layer = 1000m
        let hl = 1000;
        let sin_elevation = Math.sin(elevation * Math.PI / 180);
        let length = 2 * hl / (Math.sqrt(Math.pow(sin_elevation, 2) + (2.35 * Math.pow(10, -4))) + sin_elevation);
        //this.logMessage('sin_elev = ' + sin_elevation + ' length = ' + length);

        // Step-5: estimate effective antenna diameter
        let deff = Math.sqrt(eff) * diameter;
        //this.logMessage('deff = ' + deff);

        // Step-6: Calculate antenna averaging factor.
        let x_val = 1.22 * (freq / length) * Math.pow(deff, 2);
        let gx = Math.sqrt((3.86 * Math.pow((Math.pow(x_val, 2) + 1), (11.0 / 12))) * Math.sin((11.0 / 6) * Math.atan(1 / x_val)) - (7.08 * Math.pow(x_val, (5.0 / 6))));
        //this.logMessage('x_val =' + x_val + ' gx = ' + gx);

        // Step-7: Calculate standard deviation
        let sigma = sigma_ref * Math.pow(freq, (7 / 12.0)) * gx / Math.pow(sin_elevation, 1.2);
        //this.logMessage('sigma = ' + sigma);

        // Step-8: Calculate time percentage factor for the value of unavailability
        let unavailability = 100 - availability;
        let a_p = -0.061 * Math.pow(Utils.log10(unavailability), 3) + 0.072 * Math.pow(Utils.log10(unavailability), 2) - 1.71 * Utils.log10(unavailability) + 3;
        //this.logMessage('unavailability = ' + unavailability);
        //this.logMessage('a_p = ' + a_p);

        // Step-9: Calculation scintillation fade depth
        return a_p * sigma;
    }

    async rainAtten001 (location, freq, orbitalSlot, polarization, availability) {
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

        let stat_lat = location.lat;
        let stat_lon = location.lon;
        let ele_angle = Utils.elevationAngle(location, orbitalSlot);
        let ele_rad = ele_angle * Math.PI / 180
        let stat_height = 0

        // Rainfall rate in mm/hr as obtain from digital map table in ITU-R P.837-2
        let r_100;

        // Meteor.apply('get_rain_points', [stat_lat, stat_lon], {wait: true}, function (error, value) {
        //     this.logMessage('-------------------Get rain points is called -----------')
        //     if (error) {
        //         logError(error.reason);
        //         return false;
        //     }
        //     else {
        //         this.logMessage('Rain rate = ' + value);
        //         r_100 = value;
        //     }
        // });
        // check if lat,lon is valid
        if (stat_lat > 90 || stat_lat < -90 || stat_lon > 180 || stat_lon < -180) {
            this.logMessage('Lat/lon is not valid')
            return false
        }
        // the database grid contains lat/lon at 1.5 degree step, so find the 2 lat and 2 lons which are closest to the given point
        let x_lat = Math.floor(stat_lat / 1.5);
        let x_lon = Math.floor(stat_lon / 1.5);
        let y1 = x_lat * 1.5;
        let y2 = (x_lat + 1) * 1.5;
        let x1 = x_lon * 1.5;
        let x2 = (x_lon + 1) * 1.5;
        this.logMessage(y1 + " , " + y2 + " , " + x1 + " , " + x2);
        
        let rainPoints = await RainData.find({ lat: { $in: [y1, y2] }, lon: { $in: [x1, x2]}})
        let f11 = this.findRainValueAtPoint(rainPoints, x1, y1),
            f12 = this.findRainValueAtPoint(rainPoints, x1, y2),
            f21 = this.findRainValueAtPoint(rainPoints, x2, y1),
            f22 = this.findRainValueAtPoint(rainPoints, x2, y2);

        // Perform bi-linear interpolation
        // Source: http://en.wikipedia.org/wiki/Bilinear_interpolation

        // Linear interpolation in the x-axis for both y
        let fxy1 = Utils.linearInterpolation(stat_lon, x1, x2, f11, f21);
        let fxy2 = Utils.linearInterpolation(stat_lon, x1, x2, f12, f22);

        // Linear interpolation fxy1,fxy2 in the y-axis
        let rain = Utils.linearInterpolation(stat_lat, y1, y2, fxy1, fxy2);

        this.logMessage('topLeft = ' + f12 + ' topRight = ' + f22 + ' bottomLeft = ' + f11 + ' bottomRight = ' + f21);
        this.logMessage('Rain 001 inside rainAtten001 function = ' + rain);
        r_100 = rain;


        // unavailability, (100 percent - given availability)
        let unavailability = 100 - availability;

        // __________________________________________________________
        // First Step of algorithm is to calculate the Isotherm height for the rain : km
        // i.e., height at which rain is at 0 deg C
        //
        // Step-1:
        let rain_height = 0;
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
        let slant_path;
        if (ele_angle >= 5) {
            slant_path = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        else {
            //  very low elevation angles
            slant_path = 2 * (rain_height - stat_height) / (Math.sqrt(Math.pow(Math.sin(ele_rad), 2) + 2 * (rain_height - stat_height) / 8500) + Math.sin(ele_rad));
        }
        // Determine horizontal projection to ground of slant path length.  (this is the LG in the ITU REC)
        // Step-3:
        let horizontal_slant_path = slant_path * Math.cos(ele_rad);

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
        let freq_array = [1, 2, 4, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200,
            300, 400];

        // the following are arrays of specific values for kh, kv, alphah, and alphav.
        // they are used for interpolating when calculating actual values k_H, k_V,
        // alpha_H, and alpha_V.
        let kh = [0.0000387, 0.000154, 0.00065, 0.00175, 0.00301, 0.00454, 0.0101, 0.0188, 0.0367, 0.0751, 0.124, 0.187,
            0.263, 0.35, 0.442, 0.536, 0.707, 0.851, 0.975, 1.06, 1.12, 1.18, 1.31, 1.45, 1.36, 1.32];

        let kv = [0.0000352, 0.000138, 0.000591, 0.00155, 0.00265, 0.00395, 0.00887, 0.0168, 0.0335, 0.0691, 0.113, 0.167,
            0.233, 0.31, 0.393, 0.479, 0.642, 0.784, 0.906, 0.999, 1.06, 1.13, 1.27, 1.42, 1.35, 1.31];

        let alphah = [0.912, 0.963, 1.121, 1.308, 1.332, 1.327, 1.276, 1.217, 1.154, 1.099, 1.061, 1.021, 0.979, 0.939,
            0.903, 0.873, 0.826, 0.793, 0.769, 0.753, 0.743, 0.731, 0.71, 0.689, 0.688, 0.683];

        let alphav = [0.88, 0.923, 1.075, 1.265, 1.312, 1.31, 1.264, 1.2, 1.128, 1.065, 1.03, 1, 0.963, 0.929, 0.897, 0.868,
            0.824];

        //  find index for frequency within the frequency array
        let match = this.excelMatch(freq_array, freq);
        let freq1 = match.x1;
        let freq2 = match.x2;

        //  interpolate to find the values for k_H and K_V .: Log (K_x)vs LOG(freq)
        let khx1 = Utils.log10(freq_array[freq1]);
        let khx2 = Utils.log10(freq_array[freq2]);
        let khx3 = Utils.log10(freq);
        let khy1 = Utils.log10(kh[freq1]);
        let khy2 = Utils.log10(kh[freq2]);

        let k_H = Math.pow(10, (khy1 - (khx3 - khx1) * (khy1 - khy2) / (khx2 - khx1)));

        let kvy1 = Utils.log10(kv[freq1]);
        let kvy2 = Utils.log10(kv[freq2]);

        let k_v = Math.pow(10, (kvy1 - (khx3 - khx1) * (kvy1 - kvy2) / (khx2 - khx1)));

        // Interpolate to find the valued for alpha_H and alpha_V : Alpha_x vs log (freq)
        let alphaHy1 = alphah[freq1];
        let alphaHy2 = alphah[freq2];

        let alpha_H = alphaHy1 - (khx3 - khx1) * (alphaHy1 - alphaHy2) / (khx2 - khx1);

        let alphaVy1 = alphav[freq1];
        let alphaVy2 = alphav[freq2];

        let alpha_v = alphaVy1 - (khx3 - khx1) * (alphaVy1 - alphaVy2) / (khx2 - khx1);

        let tau = Utils.tau_value(polarization);

        // calculate the factor k
        let k = (k_H + k_v + (k_H - k_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / 2;

        // calculate the factor alpha
        let alpha = (k_H * alpha_H + k_v * alpha_v + (k_H * alpha_H - k_v * alpha_v) * Math.cos(2 * tau) * Math.pow(Math.cos(ele_rad), 2)) / (2 * k);

        // specific attenuation from frequency-dependent coefficients (dB/km)
        let gamma_r = k * Math.pow(r_100, alpha);

        // Step-6:
        // Calculate the horizontal reduction factor,r0.01, for 0.01% of the time
        let red_factor = 1 / (1 + 0.78 * Math.sqrt(horizontal_slant_path * gamma_r / freq) - 0.38 * (1 - Math.exp(-2 * horizontal_slant_path)));

        // Step-7:
        // Calculate the vertical adjustment factor,V_001,fro 0.01% of the time
        let gamma_n = Math.atan((rain_height - stat_height) / (horizontal_slant_path * red_factor)) * (180 / Math.PI);
        let l_r;
        if (gamma_n > ele_angle) {
            l_r = horizontal_slant_path * red_factor / Math.cos(ele_rad);
        }
        else {
            l_r = (rain_height - stat_height) / Math.sin(ele_rad);
        }
        let Qhi;
        if (Math.abs(stat_lat) < 36) {
            Qhi = 36 - Math.abs(stat_lat);
        }
        else {
            Qhi = 0;
        }
        let v_001 = 1 / (1 + Math.sqrt(Math.sin(ele_rad)) * ((31 * (1 - Math.exp(-ele_angle / (1 + Qhi))) * Math.sqrt(l_r * gamma_r) / Math.pow(freq, 2)) - 0.45));
        //  V_001 = 1 / (1 + sqrt(Math.sin(ele_rad)) * ((31 * (1 - exp(-1 * (El_angle / (1 + Qhi)))) * sqrt(L_R * gamma_R) / (freq ** 2)) - 0.45))

        // Step-8:
        // Calculate the effective path length, L_E
        let eff_path_length = l_r * v_001;

        // Step-9:
        // Calculate the predicted attenuation exceeded for .01% of an average year
        return gamma_r * eff_path_length
    }

    // Calculates rain attenuation from predicted attenuation exceeded for 0.01% of an average year
    async rainAtten(location, freq, orbitalSlot, polarization, availability) {
        // Calculate the estimated attenuation to be exceeded for other percentages of an average year
        // in the range of .001% to 5%  is approximated by
        let unavailability = 100 - availability;
        let stat_lat = location.lat;
        let ele_angle = Utils.elevationAngle(location, orbitalSlot);
        let ele_rad = ele_angle * Math.PI / 180;
        let rain_001 = await this.rainAtten001(location, freq, orbitalSlot, polarization, availability);
        let beta;
        if (unavailability >= 1 || Math.abs(stat_lat) >= 36) {
            beta = 0;
        }
        else if (unavailability < 1 && Math.abs(stat_lat) < 36 && ele_angle >= 25) {
            beta = -0.005 * (Math.abs(stat_lat) - 36);
        }
    
        else {
            beta = -0.005 * (Math.abs(stat_lat) - 36) + 1.8 - 4.25 * Math.sin(ele_rad);
        }
        this.logMessage('Beta = ' + beta);
        this.logMessage('Rain 001 =' + rain_001);
        this.logMessage('Unavailability = ' + unavailability);
        this.logMessage('Ele_rad = ' + ele_rad);
        return rain_001 * Math.pow((unavailability / 0.01), -(0.655 + 0.033 * Math.log(unavailability) - 0.045 * Math.log(rain_001) - beta * (1 - unavailability) * Math.sin(ele_rad)));
    
    }

    excelMatch(arr, value) {
        let obj = {};
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] > value) {
                obj.x1 = i - 1;
                obj.x2 = i;
                break;
            }
        }
        return obj;
    }

    findRainValueAtPoint(points, lon, lat) {
        return points.find(p => p.lat === lat && p.lon === lon).value;
    }

    logMessage(message, level = 5) {
        if (this.debugLevel >= level) {
            console.log(message)
        }
    }
    
}

module.exports = Atmospheric