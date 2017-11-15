/**
 * Created by thanatv on 11/15/17.
 */

var mongoose = require('mongoose');

var Contours = mongoose.model('contours', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    properties: Object,
    type: String,
    features: Array,
    modifiedAt: Number,
    modifiedBy: String

}));

var Contours2 = mongoose.model('contours2', new mongoose.Schema({
    _id: String,
    satellite: String,
    name: String,
    path: String,
    parameter: String,
    peakLatitude: Number,
    PeakLongitude: Number,
    type: String,
    geometry: Object,
    properties: Object,
    modifiedAt: Number,
    modifiedBy: String
}));

module.exports = {Contours, Contours2};