/**
 * Created by thanatv on 10/4/17.
 */

const mongoose = require('mongoose');

var Gateways  = mongoose.model('gateways', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    gateway_availability: Number,
    remote_availability: Number,
    ant_size: Number,
    hpa: Object,
    site_diversity: Object,
    data: Array
}));

module.exports = {Gateways};