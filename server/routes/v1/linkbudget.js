/**
 * Created by thanatv on 10/26/17.
 */

const _ = require('lodash');
const LinkBudget = require('../../classes/linkbudget')
const linkbudgetRouter = require('express').Router();

const Antenna = require('../../classes/antenna')
const RemoteStation = require('../../classes/remoteStation')

// return linkbudget results

linkbudgetRouter.post('/linkbudget-request', (req, res) => {
    const requestObject = req.body.requestObject;
    let linkBudget = new LinkBudget(requestObject)
    linkBudget.runLinkBudget().then((results) => {
        // if (_.has(results, 'error')) {
        //     console.log('Error found ' + results.error)
        //     res.status(404).send(results.error)
        // } else {
        //     res.status(200).send(results)
        // }
        res.status(200).send(results)
    }).catch(e => {
        res.status(404).send(e)
    })

});

module.exports = linkbudgetRouter;

