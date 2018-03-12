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

// find transponder by id
transponderRouter.post('/transponders/find-by-id', (req, res) => {
    const transponderId = req.body.transponderId;
    console.log(`Transopnder ID = ${transponderId}`)
    Transponders.findById(transponderId).then(transponder => {
        res.status(200).send({transponder})
    }).catch(e => {
        res.status(404).send(e)
    })
});

transponderRouter.post('/transponders-by-satellite', (req, res) => {
    const satellite = req.body.satellite
    Transponders.find({satellite}).then((transponders) => {
        let sortedTransponders = _.sortBy(transponders, 'country');
        res.status(200).send({ transponders: sortedTransponders });
    }).catch((e) => {
        res.status(404).send(e);
    });
})

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

transponderRouter.post('/update-eirp', (req, res) => {
    let tpData = req.body.tpData
    tpData.forEach(data => {
        console.log(`Updating data of beam ${data.beam} - ${data.path} with value ${data.delta}`)
        Transponders.findOneAndUpdate({
            name: data.beam,
            type: data.path
        }, {
            $set: {
                delta_eirp_down: data.delta
            }
        }).then((result) => {
            console.log(JSON.stringify(result, undefined, 2))
        }).catch(e => {
            res.status(404).send(e)
        })
    })
})

module.exports = transponderRouter;