const Antenna = require('./classes/antenna');
const jsonLog = require('./lib/utils').jsonLog;
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');

var cors = require('cors');

var app = express();

app.use(cors());

const port = process.env.PORT || 23324;

app.use(bodyParser.json());

app.use('/', routes);

app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

module.exports.app = app;
