/**
 * Created by thanatv on 10/5/17.
 */

const _ = require('lodash');
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

module.exports = bucRouter