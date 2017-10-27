/**
 * Created by thanatv on 10/5/17.
 */

const _ = require('lodash');
const antennaRouter = require('express').Router();

var {Antennas} = require('../../models/antennas');

// return all antennas

antennaRouter.get('/antennas', (req, res) => {
    Antennas.find().then((antennas) => {

        // Sort the results by size
        res.status(200).send({ antennas: _.sortBy(antennas, 'size' )});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = antennaRouter