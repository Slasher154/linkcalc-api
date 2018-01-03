/**
 * Created by thanatv on 12/28/17.
 */

const _ = require('lodash');
const mongoose = require('mongoose')
const zeroFill = require('zero-fill')
const savedRequests = require('express').Router();

var {SavedRequests} = require('../../models/saved_requests');

// return all users' saved requests

savedRequests.post('/saved-requests', (req, res) => {
    let {requestorEmployeeId } = req.body
    SavedRequests.find({ requestorEmployeeId }).then((savedRequests) => {
        res.status(200).send({savedRequests});
    }).catch((e) => {
        res.status(404).send(e);
    });
});

// find request by ID

savedRequests.post('/request/find-by-id', (req, res) => {
    const requestId = req.body.savedRequestId
    SavedRequests.findById(requestId).then(savedRequest => {
        res.status(200).send({savedRequest})
    }).catch(e => {
        res.status(404).send(e)
    })
})

// save the link budget request

// savedRequests.post('/request/save', (req, res) => {
//     const savedRequest = req.body.savedRequest
//     savedRequest._id = mongoose.Types.ObjectId().toString()
//     SavedRequests.insertMany([savedRequest]).then(request => {
//         res.status(200).send({savedRequest: request[0]});
//     }).catch(e => {
//         res.status(404).send(e)
//     })
// })

// save the link budget request

savedRequests.post('/request/save', async function(req, res) {
    const savedRequest = req.body.savedRequest
    savedRequest._id = mongoose.Types.ObjectId().toString()
    // find the maximum index of request in this year
    let currentYear = (new Date()).getFullYear()
    try {
        let requestsOfThisYear = await SavedRequests.find({ year: currentYear}, 'index year')
        let index = 1
        if (requestsOfThisYear.length > 0) {
            index = _.orderBy(requestsOfThisYear, ['index'], ['desc'])[0].index + 1
            // index = requestsOfThisYear.index + 1
        }
        Object.assign(savedRequest, {
            index,
            year: currentYear,
            requestName: `${zeroFill(4, index)}_${currentYear}`
        })
        let request = await SavedRequests.insertMany([savedRequest])
        if (request) {
            res.status(200).send({savedRequest: request[0]});
        } else {
            res.status(404).send(e)
        }
    } catch (e) {
        console.log(e)
        res.status(404).send(e)
    }

})

module.exports = savedRequests;
