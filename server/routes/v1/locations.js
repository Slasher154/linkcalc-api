/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const locationRouter = require('express').Router();

var {Locations} = require('../../models/locations');

// return all locations

locationRouter.get('/locations', (req, res) => {
    Locations.find().then((locations) => {
        res.status(200).send({locations});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return only location name

locationRouter.get('/locations/name', (req, res) => {
    Locations.find().then((locations) => {
        res.status(200).send({locations: _.map(locations, 'name').sort() });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return location name, country, city, lat, lon
locationRouter.get('/locationswithcoords', (req, res) => {
    Locations.find().then((locations) => {
        res.status(200).send({locations: _.sortBy(_.map(locations, loc => _.pick(loc, ['name', 'country', 'city', 'lat', 'lon'])), 'name') });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

locationRouter.get('/locations/:id', (req, res) => {
    const locId = req.params.id;
    Locations.findOne({_id: locId}).then((location) => {
        res.status(200).send({location});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return single location by name

locationRouter.post('/singleLocationByName', (req, res) => {
    let locationName = req.body.location;
    Locations.findOne({name: locationName}).then((location) => {
        res.status(200).send({location});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return multiple locations by array of name

locationRouter.post('/multipleLocationsByNames', (req, res) => {
    let locationNames = req.body.locations;
    Locations.find({ name: { $in: locationNames} }).then((locations) => {
        res.status(200).send({locations});
    }).catch((e) => {
        res.status(404).send(e);
    })
});

module.exports = locationRouter;