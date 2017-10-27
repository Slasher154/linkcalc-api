/**
 * Created by thanatv on 10/27/17.
 */

var mongoose = require('mongoose');

var AdjSats = mongoose.model('adjacent_satellites', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    satellite: {
        type: String,
        required: true
    },
    beam: {
        type: String,
    },
    adj1: {
        type: String
    },
    adj2: {
        type: String
    },
    topocentric1: {
        type: Number
    },
    topocentric2: {
        type: Number
    },
    uplinkPdens1: {
        type: Number
    },
    uplinkPdens2: {
        type: Number
    },
    downlinkPdens1: {
        type: Number
    },
    downlinkPdens2: {
        type: Number
    },
    adjacent1: {
        type: Number
    },
    adjacent2: {
        type: Number
    }


}));

module.exports = {AdjSats};