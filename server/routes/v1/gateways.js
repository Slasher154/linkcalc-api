/**
 * Created by thanatv on 10/4/17.
 */

const _ = require('lodash');
const gatewayRouter = require('express').Router();

var {Gateways} = require('../../models/gateways');

// return all locations

gatewayRouter.get('/gateways', (req, res) => {
    Gateways.find().then(gateways => {
        res.status(200).send({gateways});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = gatewayRouter;