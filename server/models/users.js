/**
 * Created by thanatv on 12/28/17.
 */

var mongoose = require('mongoose');

var Users = mongoose.model('users', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    roles: {
        type: Array
    }
}));

module.exports = {Users};