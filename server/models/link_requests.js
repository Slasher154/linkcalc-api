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
    },
    formatted_date: { // included to show in link requests tables
        type: String
    }
});

module.exports = {LinkRequests};
