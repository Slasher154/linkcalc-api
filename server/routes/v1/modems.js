/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const moment = require('moment')
const modemRouter = require('express').Router();

var {Modems} = require('../../models/modems');

// return all modems

modemRouter.get('/modems', (req, res) => {
    Modems.find().then((modems) => {
        res.status(200).send({modems});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// return all modem names

modemRouter.get('/modems/name', (req, res) => {
    Modems.find().then((modems) => {
        res.status(200).send({modems: _.map(modems, 'name').sort() });
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find modem from ID

modemRouter.post('/modems/find-by-id', (req, res) => {
    const modemId = req.body.modemId;
    console.log(`Modem ID = ${modemId}`)
    Modems.findById(modemId).then((modem) => {
        res.status(200).send({modem});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find modem from name

modemRouter.post('/modems/find-by-name', (req, res) => {
    const modemName = req.body.modem;
    // console.log(modemName)
    Modems.findOne({ name: modemName }).then((modem) => {
        res.status(200).send({modem});
    }).catch((e) => {
        res.status(404).send(e);
    });
});


// edit modem

modemRouter.post('/modems/edit', (req, res) => {
    console.log(req.body.modem)
    // const modemId = req.body.modemId
    const modem = req.body.modem
    // modem._id = modemId
    Modems.findOneAndUpdate({ _id: modem._id}, modem).then((modem) => {
        res.status(200).send({modem})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// add modem

modemRouter.post('/modems/add', (req, res) => {
    const modem = req.body.modem;
    modem._id = mongoose.Types.ObjectId().toString() // Generate the Object ID in String format
    Modems.insertMany([modem]).then(modem => {
        res.status(200).send({modem: modem[0]});
    }).catch((e) => {
        res.status(404).send(e);
    });
})

// delete modem

modemRouter.post('/modems/delete', (req, res) => {
    const modemId = req.body.modemId;
    Modems.findByIdAndRemove(modemId).then(modem => {
        res.status(200).send({modem})
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = modemRouter;
