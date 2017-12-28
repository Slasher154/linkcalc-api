/**
 * Created by thanatv on 12/15/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
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

// add modem vendor

modemVendorRouter.post('/modem-vendors/add', (req, res) => {
    const modemVendor = { name: req.body.name }
    modemVendor._id = mongoose.Types.ObjectId().toString()
    ModemVendors.insertMany([modemVendor]).then(vendor => {
        res.status(200).send({modemVendor: vendor[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = modemVendorRouter;
