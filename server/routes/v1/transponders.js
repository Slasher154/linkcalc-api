/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const transponderRouter = require('express').Router();

var {Satellites} = require('../../models/satellites');
var {Transponders} = require('../../models/transponders');

// find all transponders by Beam

// transponderRouter.get('/transponders/:beam', (req, res) => {
//
//     const beam = req.params.beam;
//
//     Transponders.find({ uplink_beam: beam }).then((transponders) => {
//        let sortedTransponders = _.sortBy(transponders, 'name');
//        res.status(200).send({ transponders: sortedTransponders });
//     }).catch((e) => {
//         res.status(404).send(e);
//     });
// })

transponderRouter.get('/allTransponders', (req, res) => {
    Transponders.find().then((transponders) => {
        let sortedTransponders = _.sortBy(transponders, 'satellite');
        res.status(200).send({ transponders: sortedTransponders });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

transponderRouter.post('/transponders', (req, res) => {

    const beam = req.body.beam;

    Transponders.find({ uplink_beam: beam }).then((transponders) => {
        let sortedTransponders = _.sortBy(transponders, 'name');
        res.status(200).send({ transponders: sortedTransponders });
    }).catch((e) => {
        res.status(404).send(e);
    });
})

module.exports = transponderRouter;