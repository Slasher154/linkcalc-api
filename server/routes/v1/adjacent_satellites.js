/**
 * Created by thanatv on 10/27/17.
 */

const _ = require('lodash');
const adjSatRouter = require('express').Router();

var {AdjSats} = require('../../models/adjacent_satellites');

// return all adjacent satellites

adjSatRouter.get('/adjsat', (req, res) => {
    AdjSats.find().then((sats) => {

        // Sort the results by size
        res.status(200).send({ adjsats: sats});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = adjSatRouter