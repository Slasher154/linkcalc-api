var mongoose = require('mongoose');

var Satellites = mongoose.model('satellites', new mongoose.Schema({

    _id: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    orbital_slot: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    isThaicom: {
        type: Boolean,
        required: true
    },
    isActive: {
        type: Boolean,
        required: true,
    },
    skb: Number

}));

module.exports = { Satellites };
