var mongoose = require('mongoose');

var SavedRequests = mongoose.model('saved_requests', new mongoose.Schema({
    _id: {
        type: String
    },
    assumptions: {
        type: Object
    },
    requestName: {
        type: String
    },
    results: {
        type: Object,
        required: true
    },
    requestorEmployeeId: {
        type: String,
        required: true
    },
    requestorName: {
        type: String
    },
    requestedDate: {
        type: Number
    },
    index: {
        type: Number
    },
    year: {
        type: Number
    },
    description: {
        type: String
    }
}));

module.exports.SavedRequests = SavedRequests;
