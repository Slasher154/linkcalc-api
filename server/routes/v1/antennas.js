/**
 * Created by thanatv on 10/5/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const antennaRouter = require('express').Router();

var {Antennas} = require('../../models/antennas');

// return all antennas

antennaRouter.get('/antennas', (req, res) => {
    Antennas.find().then((antennas) => {

        // Sort the results by size
        res.status(200).send({ antennas: _.sortBy(antennas, 'size' )});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find antenna by ID

antennaRouter.post('/antennas/find-by-id', (req, res) => {
    const antennaId = req.body.antennaId;
    console.log(`Antenna ID = ${antennaId}`)
    Antennas.findById(antennaId).then(antenna => {
        res.status(200).send({antenna})
    }).catch(e => {
        res.status(404).send(e)
    })
});

// edit antenna

antennaRouter.post('/antennas/edit', (req, res) => {
    const antenna = req.body.antenna
    Antennas.findOneAndUpdate({ _id: antenna._id}, { $set: antenna }).then(antenna => {
        res.status(200).send({antenna})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// add antenna

antennaRouter.post('/antennas/add', (req, res) => {
    const antenna = req.body.antenna;
    antenna._id = mongoose.Types.ObjectId().toString() // Generate the Object ID in String format
    Antennas.insertMany([antenna]).then(antenna => {
        res.status(200).send({antenna: antenna[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

// delete antenna

antennaRouter.post('/antennas/delete', (req, res) => {
    const antennaId = req.body.antennaId;
    Antennas.findByIdAndRemove(antennaId).then(antenna => {
        res.status(200).send({antenna})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// update patterns

antennaRouter.post('/antenna-pattern/save', (req, res) => {
    const { _id, patterns } = req.body
    Antennas.findOneAndUpdate({ _id: _id}, { $set: patterns }).then(antenna => {
        res.status(200).send({antenna})
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = antennaRouter