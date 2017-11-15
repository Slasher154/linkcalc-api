/**
 * Created by thanatv on 11/15/17.
 */

const _ = require('lodash')
var {Contours2} = require('../models/contours');

class Contour {
    constructor (contourObject) {
        for (var field in contourObject) {
            this[field] = contourObject[field]
        }
    }

    static async getBestBeam({ location, satellite, path, parameter }) {
        let bestContour = await this.getContour({
            location,
            satellite,
            path,
            parameter
        })
        return bestContour
    }

    static async getContour ({ location, satellite, beam, path, parameter }) {
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
            'properties.satellite': satellite,
            'properties.path': path,
            'properties.parameter': parameter
        }
        if (beam) {
            query['properties'][name] = beam
        }
        // console.log(`Query: ${JSON.stringify(query, undefined, 2)}`)
        try {
            let results = await Contours2.find(query)
            console.log(`The query returns ${results.length} results`)
            if (results) {
                let valueIndicator = results[0][parameter] ? parameter : 'relativeGain'
                console.log(`Value indicator is ${valueIndicator}`)
                // The best contour is contour with maximum value indicator (gain, eirp, g/t) unless it's only beam
                let filteredResults = results
                if (results.length > 1) {
                    filteredResults = _.remove(results, re => {
                        return !re.properties.name.startsWith('BC')
                    })
                }
                let bestContour = _.min(filteredResults, (re) => {
                    return re['properties'][valueIndicator]
                })
                return bestContour
            } else {
                console.log('This location is out of coverage of the given beam')
                return false
            }
        } catch(e) {
            console.log(e)
            return false
        }
    }
}

module.exports = Contour