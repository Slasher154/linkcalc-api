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
    dynamic_range: Number,
    designed_deepin: Number,
    eirp_up_channel: Number,
    country: String,
    contour_50: Number,
    contour_eoc: Number,
    atten_range: Number,
    default_atten: Number,
    current_num_carriers: String,
    backoff_settings: Array,
    default_gateway: String,
    lat: Number,
    lon: Number,
    actual: Number,
    ci_downlink_adj_cell_50: Number,
    ci_downlink_adj_cell_eoc: Number,
    ci_uplink_adj_cell_50: Number,
    ci_uplink_adj_cell_eoc: Number,
    ci_uplink_adj_sat: Number,
    ci_downlink_adj_sat: Number,
    ci_uplink_adj_cell: Number,
    ci_downlink_adj_cell: Number,
    eirp_density_adjacent_satellite_downlink: Number,
    adjacent_satellite_orbital_slot: Number
    

}));

module.exports = { Transponders };
/**
 * Created by thanatv on 9/19/17.
 */
