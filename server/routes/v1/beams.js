/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const beamRouter = require('express').Router();

var {Satellites} = require('../../models/satellites');
var {Transponders} = require('../../models/transponders');

// find all beams by satellite name

beamRouter.post('/beams', (req, res) => {
    const satellite = req.body.satellite;

    findBeamBySatelliteName(satellite).then((beams) => {
        console.log(beams.length);
        let uniqueBeams = sortBeams(beams);
      res.status(200).send({ beams: uniqueBeams });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find all beams by satellite ID

beamRouter.get('/beams/:id', (req, res) => {
    const satelliteId = req.params.id;

    Satellites.findOne( { _id: satelliteId }).then((satellite) => {
        if (satellite) {
            // Query mongodb transponder collections from satellite name
            return findBeamBySatelliteName(satellite.name);
        } else {
            res.status(404).send('Invalid satellite Id');
        }
    }).then((beams) => {
        // return unique & sorted beams
        let uniqueBeams = sortBeams(beams);
        res.status(200).send({ beams: uniqueBeams });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

function sortBeams(beams) {
    return _.uniq(_.map(beams, 'uplink_beam')).sort();
}

function findBeamBySatelliteName(satelliteName) {
    return Transponders.find({satellite: satelliteName });
}

module.exports = beamRouter;