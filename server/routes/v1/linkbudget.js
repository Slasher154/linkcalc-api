/**
 * Created by thanatv on 10/26/17.
 */

const _ = require('lodash');
const linkbudgetRouter = require('express').Router();

// return linkbudget results

linkbudgetRouter.post('/linkbudget-request', (req, res) => {
    const requestObject = req.body.requestObject;
    res.status(200).send({requestObject})
});

module.exports = linkbudgetRouter;

