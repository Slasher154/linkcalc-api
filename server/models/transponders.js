var mongoose = require('mongoose');

// In the mongodb database, database name 'channels' was used to represent transponders
var Transponders = mongoose.model('channels', new mongoose.Schema({
    _id: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    satellite: String,
    uplink_cf: Number,
    downlink_cf: Number,
    bandwidth: Number,
    type: String,
    uplink_beam: String,
    gt_peak: Number,
    uplink_pol: String,
    downlink_beam: String,
    saturated_eirp_peak: Number,
    downlink_pol: String,
    transponder: String,
    mode: String,
    sfd: Number,
    atten_range: Number,
    default_atten: Number,
    current_num_carriers: String,
    backoff_settings: Array

}));

module.exports = { Transponders };
/**
 * Created by thanatv on 9/19/17.
 */
