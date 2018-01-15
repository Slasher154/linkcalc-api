/**
 * Created by thanatv on 11/15/17.
 */

const _ = require('lodash');
const Q = require('q');
const turf = require('@turf/turf')
const geojsonArea = require('@mapbox/geojson-area');
const contourRouter = require('express').Router();
const Contour = require('../../classes/contour')

var {Contours2} = require('../../models/contours');
let {Grids} = require('../../models/grids')

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
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [location.lon, location.lat]
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
                // We won't return broadcast beam by default
                return re['properties'][valueIndicator] && !re.properties.name.startsWith('BC')
            })
            res.status(200).send(bestContour)
        } else {
            res.status(200).send('This location is out of coverage of the given beam')
        }
    }).catch(e => {
        res.status(404).send(e)
    })
})

contourRouter.post('/get-bestbeam', (req, res) => {
    let {location, satellite, path, parameter, countries} = req.body;
    Contour.getBestBeam({location, satellite, path, parameter, countries}).then(result => {
        res.status(200).send(result)
    }).catch(e => {
        res.status(404).send(e)
    })
})

contourRouter.post('/find-matching-return-contour', (req, res) => {
    let {satellite, beam, contourValue} = req.body;
    Contour.getMatchingReturnContour({satellite, beam, contourValue}).then(result => {
        res.status(200).send(result)
    }).catch(e => {
        res.status(404).send(e)
    })
})

contourRouter.post('/get-contour-lines', (req, res) => {
    let {contourObjects} = req.body // Array of objects which specifies contour properties to query
    Contour.getMultipleContourLines(contourObjects).then(result => {
        res.status(200).send(result)
    }).catch(e => {
        res.status(404).send(e)
    })
})

contourRouter.post('/generate-grid', (req, res) => {
    console.log('Generating grid')
    let promises = []
    // Object containing properties to create the grid
    console.log(JSON.stringify(req.body))
    let {topLeftLatitude, topLeftLongitude, bottomRightLatitude, bottomRightLongitude, latitudeStep, longitudeStep, satellite, parameter, path} = req.body
    if (topLeftLatitude <= bottomRightLatitude || topLeftLongitude >= bottomRightLongitude) {
        res.status(403).send()
    }
    for (let i = topLeftLatitude; i >= bottomRightLatitude; i -= latitudeStep) {
        for (let j = topLeftLongitude; j <= bottomRightLongitude; j += longitudeStep) {
            promises.push(Contour.getBestBeam({
                location: {
                    lat: i,
                    lon: j
                },
                satellite,
                parameter,
                path
            }))
        }
    }
    // Resolve all find best beam promises
    Q.all(promises).then(results => {
        let gridInsertPromises = []
        results.forEach(result => {
            let contour = result.valueOf()
            // If contour.bestContour does not return false, there is a beam covering this location. Otherwise, location is out of
            // not covered by any beam in our database
            if (contour.bestContour) {
                let grid = {
                    lat: contour.location.lat,
                    lon: contour.location.lon,
                    properties: contour.bestContour.properties
                }
                gridInsertPromises.push(Grids.findOneAndUpdate({
                    lat: grid.lat,
                    lon: grid.lon
                }, grid , { upsert: true }))
            }

        })
        // Resolve all insert to database promises
        return Q.all(gridInsertPromises)
    }).then(results => {
        console.log(`Insert completed`)
        res.status(200).send()
    }).catch(e => {
        console.log(e)
    })


})

module.exports = contourRouter;