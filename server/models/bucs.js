/**
 * Created by thanatv on 10/5/17.
 */

var mongoose = require('mongoose');

var Bucs = mongoose.model('bucs', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: String,
    category: String,
    size: {
        type: Number,
        required: true
    },
    ifl: Number,
    obo: Number

}));

module.exports = {Bucs};
