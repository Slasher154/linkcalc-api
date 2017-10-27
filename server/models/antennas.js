/**
 * Created by thanatv on 10/5/17.
 */

var mongoose = require('mongoose');

var Antennas = mongoose.model('antennas', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: String,
    vendor: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },

}));

module.exports = {Antennas};
