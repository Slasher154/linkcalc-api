/**
 * Created by thanatv on 11/15/17.
 */

const _ = require('lodash');
const contourRouter = require('express').Router();

var {Contours2} = require('../../models/contours');

// Return relative contour in number
contourRouter.post('/get-contour', (req, res) => {
    let {location, satellite, beam, path, parameter} = req.body;
    // This query will return all contours that covers the given point
    console.log(`Location: ${location.lat}, ${location.lon}`)
    console.log(`Satellite: ${satellite}`)
    console.log(`Beam: ${beam} - ${path}`)
    console.log(`Parameter: ${parameter}`)
    let query = {
        geometry: {
            $geoIntersects:
                {
                    $geometry:
                        {
                            type: 'Point',
                            coordinates: [location.lon,location.lat]
                        }
                }
        },
        'properties.name': beam,
        'properties.satellite': satellite,
        'properties.path': path,
        'properties.parameter': parameter
    }
    console.log(`Query: ${JSON.stringify(query, undefined, 2)}`)
    Contours2.find(query).then(results => {
        console.log(`The query returns ${results.length} results`)
        if (results) {
            let valueIndicator = results[0][parameter] ? parameter : 'relativeGain'
            console.log(`Value indicator is ${valueIndicator}`)
            // The best contour is contour with maximum value indicator (gain, eirp, g/t)
            let bestContour = _.min(results, (re) => {
                return re['properties'][valueIndicator]
            })
            res.status(200).send(bestContour)
        } else {
            res.status(200).send('This location is out of coverage of the given beam')
        }
    }).catch(e => {
        res.status(404).send(e)
    })
})

module.exports = contourRouter;