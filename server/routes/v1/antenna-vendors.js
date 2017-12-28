/**
 * Created by thanatv on 12/15/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
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

// add antenna vendors

antennaVendorRouter.post('/antenna-vendors/add', (req, res) => {
    const antennaVendor = { name: req.body.name }
    antennaVendor._id = mongoose.Types.ObjectId().toString()
    AntennaVendors.insertMany([antennaVendor]).then(vendor => {
        res.status(200).send({antennaVendor: vendor[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = antennaVendorRouter;
