/**
 * Created by thanatv on 9/19/17.
 */

const mongoose = require('mongoose');

var Locations  = mongoose.model('locations', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    country: String,
    city: String,
    lon: Number,
    lat: Number,
    data: Array
}));

module.exports = {Locations};