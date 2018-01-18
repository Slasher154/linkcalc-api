require('dotenv').config()
const Antenna = require('./classes/antenna');
const jsonLog = require('./lib/utils').jsonLog;
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const ObjectID = require('mongodb').ObjectID;
const path = require('path');
const moment = require('moment');
const routes = require('./routes');


var mongoose = require('./db/mongoose').mongoose;

var cors = require('cors');

var app = express();

app.use(cors());

const port = process.env.PORT || 23324;

app.use(bodyParser.json());

app.use('/', routes);

// app.get('/', (req, res) => {
//     res.send('Hello world!');
// });

app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

module.exports.app = app;
