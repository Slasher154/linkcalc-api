/**
 * Created by thanatv on 1/11/18.
 */
var mongoose = require('mongoose');

// In the mongodb database, database name 'channels' was used to represent transponders
var Grids = mongoose.model('grids', new mongoose.Schema({
    _id: {
        type: String
    },
    lat: {
        type: Number
    },
    lon: {
        type: Number
    },
    properties: {
        type: Object
    }



}));

module.exports = { Grids };