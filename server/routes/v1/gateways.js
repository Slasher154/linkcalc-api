/**
 * Created by thanatv on 10/4/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const gatewayRouter = require('express').Router();

var {Gateways} = require('../../models/gateways');

// return all locations

gatewayRouter.get('/gateways', (req, res) => {
    Gateways.find().then(gateways => {
        res.status(200).send({gateways: _.sortBy(gateways, 'name')});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find gateway by id
gatewayRouter.post('/gateways/find-by-id', (req, res) => {
    const gatewayId = req.body.gatewayId;
    console.log(`Gateway ID = ${gatewayId}`)
    Gateways.findById(gatewayId).then(gateway => {
        res.status(200).send({gateway})
    }).catch(e => {
        res.status(404).send(e)
    })
});

// find gateway by name

gatewayRouter.post('/gateways/find-by-name', (req, res) => {
    const name = req.body.name;
    console.log(`Gateway name = ${name}`)
    Gateways.findOne({name}).then(gateway => {
        res.status(200).send({gateway})
    }).catch(e => {
        res.status(404).send(e)
    })
});

// edit gateway

gatewayRouter.post('/gateways/edit', (req, res) => {
    const gateway = req.body.gateway
    Gateways.replaceOne({ _id: gateway._id}, gateway).then(gateway => {
        res.status(200).send({gateway})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// add gateway

gatewayRouter.post('/gateways/add', (req, res) => {
    const gateway = req.body.gateway;
    console.log('Incoming gateway = ' + JSON.stringify(gateway, undefined, 2))
    gateway._id = mongoose.Types.ObjectId().toString() // Generate the Object ID in String format
    Gateways.insertMany([gateway]).then(gateway => {
        res.status(200).send({gateway: gateway[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

// delete gateway

gatewayRouter.post('/gateways/delete', (req, res) => {
    const gatewayId = req.body.gatewayId;
    Gateways.findByIdAndRemove(gatewayId).then(gateway => {
        res.status(200).send({gateway})
    }).catch(e => {
        res.status(404).send(e)
    })
})


module.exports = gatewayRouter;