/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const locationRouter = require('express').Router();

var {RainData} = require('../../models/locations');

// return all locations (without data)

locationRouter.get('/locations', (req, res) => {
    RainData.find().then((locations) => {
        res.status(200).send({locations});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

locationRouter.get('/locations/:id', (req, res) => {
    const locId = req.params.id;
    RainData.findOne({_id: locId}).then((location) => {
        res.status(200).send({location});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return single location by name

locationRouter.post('/singleLocationByName', (req, res) => {
    let locationName = req.body.location;
    RainData.findOne({name: locationName}).then((location) => {
        res.status(200).send({location});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return multiple locations by array of name

locationRouter.post('/multipleLocationsByNames', (req, res) => {
    let locationNames = req.body.locations;
    RainData.find({ name: { $in: locationNames} }).then((locations) => {
        res.status(200).send({locations});
    }).catch((e) => {
        res.status(404).send(e);
    })
});

module.exports = locationRouter;