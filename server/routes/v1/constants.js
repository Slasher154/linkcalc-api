/**
 * Created by thanatv on 2/22/18.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const constantRouter = require('express').Router();

var {Constants} = require('../../models/constants');

// return all constants in one object

constantRouter.get('/constants', (req, res) => {
    Constants.find().then((constants) => {
        res.status(200).send({ constants: _.sortBy(constants, 'alias' )});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find constant by alias

constantRouter.post('/constants/find-by-alias', (req, res) => {
    const alias = req.body.alias;
    console.log(`Constant alias = ${alias}`)
    Constants.findOne({alias}).then(constant => {
        res.status(200).send({constant})
    }).catch(e => {
        res.status(404).send(e)
    })
});

// edit constant

constantRouter.post('/constants/edit', (req, res) => {
    const constant = req.body.constant
    Constants.findOneAndUpdate({ _id: constant._id}, constant).then(constant => {
        res.status(200).send({constant})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// add constant

constantRouter.post('/constants/add', (req, res) => {
    const constant = req.body.constant;
    console.log('Incoming constant = ' + JSON.stringify(constant, undefined, 2))
    constant._id = mongoose.Types.ObjectId().toString() // Generate the Object ID in String format
    Constants.insertMany([constant]).then(constant => {
        res.status(200).send({constant: constant[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

// delete constant

constantRouter.post('/constants/delete', (req, res) => {
    const constantId = req.body.constantId;
    Constants.findByIdAndRemove(constantId).then(constant => {
        res.status(200).send({constant})
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = constantRouter