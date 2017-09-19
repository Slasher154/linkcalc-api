/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
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

// find modem from name

modemRouter.post('/modems/findByName', (req, res) => {
    const modemName = req.body.modem;

    Modems.findOne({ name: modemName }).then((modem) => {
        res.status(200).send({modem});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = modemRouter;
