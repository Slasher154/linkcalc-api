/**
 * Created by thanatv on 12/15/17.
 */

const _ = require('lodash');
const antennaVendorRouter = require('express').Router();

var {AntennaVendors} = require('../../models/antenna-vendors');

// return all modems

antennaVendorRouter.get('/antenna-vendors', (req, res) => {
    AntennaVendors.find().then((antennaVendors) => {
        res.status(200).send({antennaVendors});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = antennaVendorRouter;
