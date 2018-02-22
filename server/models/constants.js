/**
 * Created by thanatv on 2/22/18.
 */

var mongoose = require('mongoose');

var Constants = mongoose.model('constants', new mongoose.Schema({
    _id: {
        type: String,
    },
    name: {
        type: String,
        required: true
    },
    alias: {
        type: String,
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    unit: String
}));

module.exports = {Constants};
