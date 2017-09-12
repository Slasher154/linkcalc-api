const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

// var {mongoose} = require('./db/mongoose');
// var {LinkRequests} = require('./models/link_requests');

var app = express();
const port = process.env.PORT || 23324;

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('hi');
});

app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

module.exports = {app};
