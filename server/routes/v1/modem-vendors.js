/**
 * Created by thanatv on 12/15/17.
 */

const _ = require('lodash');
const modemVendorRouter = require('express').Router();

var {ModemVendors} = require('../../models/modem-vendors');

// return all modems

modemVendorRouter.get('/modem-vendors', (req, res) => {
    ModemVendors.find().then((modemVendors) => {
        res.status(200).send({modemVendors});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = modemVendorRouter;
