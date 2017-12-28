/**
 * Created by thanatv on 10/5/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const bucRouter = require('express').Router();

var {Bucs} = require('../../models/bucs');

// return all bucs

bucRouter.get('/bucs', (req, res) => {
    Bucs.find().then((bucs) => {

        // Sort the results by size
        res.status(200).send({ bucs: _.sortBy(bucs, 'size' )});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find buc by ID

bucRouter.post('/bucs/find-by-id', (req, res) => {
    const bucId = req.body.bucId;
    console.log(`Buc ID = ${bucId}`)
    Bucs.findById(bucId).then(buc => {
        res.status(200).send({buc})
    }).catch(e => {
        res.status(404).send(e)
    })
});

// edit buc

bucRouter.post('/bucs/edit', (req, res) => {
    const buc = req.body.buc
    Bucs.findOneAndUpdate({ _id: buc._id}, buc).then(buc => {
        res.status(200).send({buc})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// add buc

bucRouter.post('/bucs/add', (req, res) => {
    const buc = req.body.buc;
    buc._id = mongoose.Types.ObjectId().toString() // Generate the Object ID in String format
    Bucs.insertMany([buc]).then(buc => {
        res.status(200).send({buc: buc[0]});
    }).catch(e => {
        res.status(404).send(e)
    })
})

// delete buc

bucRouter.post('/bucs/delete', (req, res) => {
    const bucId = req.body.bucId;
    Bucs.findByIdAndRemove(bucId).then(buc => {
        res.status(200).send({buc})
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = bucRouter