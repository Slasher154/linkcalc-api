/**
 * Created by thanatv on 11/15/17.
 */

const _ = require('lodash');
const migrationRouter = require('express').Router();

var {Contours, Contours2} = require('../../models/contours');

// return all antennas

migrationRouter.post('/migrate-contour', (req, res) => {
    let query = req.body.query;
    Contours.find(query).then((contours) => {
        let docs = []
        contours.forEach(contour => {
            contour.features.forEach(feature => {
                let newContourObject = {
                    type: 'Feature',
                    geometry: feature.geometry,
                    properties: feature.properties,
                }
                newContourObject.geometry.type = "Polygon"
                let valueIndicator = newContourObject.properties[newContourObject.properties.parameter] ? newContourObject.properties.parameter : 'relativeGain'
                console.log(`Pushing ${valueIndicator} ${newContourObject.properties[valueIndicator]} contour of beam ${newContourObject.properties.name} - ${newContourObject.properties.path}`)
                docs.push(newContourObject)
            })
        })
        Contours2.insertMany(docs).then(docs => {
            // Sort the results by size
            console.log('Contours added.')
            res.status(200).send('ok');
        }).catch(e => {
            res.status(404).send(e)
        })

    }).catch((e) => {
        res.status(404).send(e);
    });
});

module.exports = migrationRouter