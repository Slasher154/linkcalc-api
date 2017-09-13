var mongoose = require('mongoose');

var LinkRequests = mongoose.model('link_requests', {
    _id: {
        type: String
    },
    assumptions: {
        type: Object
    },
    results: {
        type: Array
    },
    requestor_id: {
        type: String
    },
    requestor_name: {
        type: String
    },
    requested_date: {
        type: Number
    },
    warning_messages: {
        type: Array
    }
});

module.exports = {LinkRequests};
