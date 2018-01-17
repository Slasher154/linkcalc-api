/**
 * Created by thanatv on 11/15/17.
 */

const _ = require('lodash')
const {Satellites} = require('../models/satellites');
const {Contours2} = require('../models/contours');
const {Transponders} = require('../models/transponders');
const Transponder = require('../classes/transponder');
const turf = require('@turf/turf')
const Utils = require('./utils')

class Contour {
    constructor(contourObject) {
        for (var field in contourObject) {
            this[field] = contourObject[field]
        }
    }

    static async getBestBeam({location, satellite, countries, path, parameter}) {
        let queryObject = {
            location,
            satellite,
            path,
            parameter
        }
        // Find all beam names from given country if given
        if (countries && countries.length > 0) {
            let transponders = await Transponders.find({ satellite, type: path})
            let beamNames = transponders.filter(tp => {
                return countries.includes(tp.country)
            }).map(tp => tp.name)
            console.log(`Beams in ${countries.join(',')} are ${beamNames.join(',')}`)
            queryObject.beams = beamNames
        }
        let bestContour = await this.getContour(queryObject)
        return {bestContour, location}
    }

    static async getContour({location, satellite, beam, beams, path, parameter}) {
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
            'properties.satellite': satellite,
            'properties.path': path,
            'properties.parameter': parameter
        }
        if (beam) {
            query['properties.name'] = beam
        }
        else if (beams) {
            query['properties.name'] = {
                $in: beams
            }
        }
        else {

        }
        // console.log(`Query: ${JSON.stringify(query, undefined, 2)}`)
        try {
            let results = await Contours2.find(query)
            console.log(`The query for ${location.lat},${location.lon} returns ${results.length} results`)
            if (results.length > 0) {
                let valueIndicator = results[0][parameter] ? parameter : 'relativeGain'
                console.log(`Value indicator is ${valueIndicator}`)
                // The best contour is contour with maximum value indicator (gain, eirp, g/t) unless it's only beam
                let filteredResults = results
                if (results.length > 1) {
                    filteredResults = _.remove(results, re => {
                        // Not include Broadcast beam contours
                        return !re.properties.name.startsWith('BC')
                    })
                }

                // Query the channels to get its EIRP. In order to compare the best beam, we need to also take beam EIRP
                // into account not just only relative contour. (Otherwise, -0.5 dB contour of shape beam will have be
                // returned as answer instead of -4 dB contour of spot beam despite shape beam has total less EIRP down than spot)
                let beamNames = filteredResults.map(r => r.properties.name)
                let transponders = await Transponders.find({
                    type: path,
                    name: { $in: beamNames },
                    satellite
                })

                // Find the absolute EIRP or G/T value of that contour
                filteredResults.forEach(r => {
                    let absoluteValue = 0
                    if (valueIndicator === 'relativeGain') {
                        // Search for the corresponding beam
                        let tp = Transponder.searchByBeamAndPath(transponders, r.properties.name, r.properties.path)
                        // Calculate EIRP density of this beam in case of eirp

                        if (parameter === 'eirp') {
                            absoluteValue = tp.saturated_eirp_peak - 10 * Math.log10(tp.bandwidth * Math.pow(10,6))
                        }
                        // Otherwise find G/T
                        else if (parameter === 'gt') {
                            absoluteValue = tp.gt_peak
                        }
                        else {}
                        // Add absolute value properties of EIRP or G/T (use this value to find the best beam)
                        // which equals to EIRPden or G/T at peak combines with relative contour value
                        absoluteValue = absoluteValue + r.properties.relativeGain
                    } else {
                        // absolute value just equal to value returned from the database
                        absoluteValue = r.properties[valueIndicator]
                    }
                    r.absoluteValue = absoluteValue
                })

                // let bestContour = _.min(filteredResults, (re) => {
                //     return re['properties'][valueIndicator]
                // })
                // Obtain the best result, which is the one with highest absolute value (highest EIRP or G/T)
                // filteredResults.forEach(f => console.log(`Beam: ${f.properties.name}, ${f.properties.relativeGain} => ${f.absoluteValue} `))
                // let bestContour = _.max(filteredResults, (re) => {
                //     return re.absoluteValue
                // })
                // return bestContour
                let bestContour = {}
                let maxValue = -9999
                filteredResults.forEach(f => {
                    if (f.absoluteValue > maxValue) {
                        bestContour = f
                        maxValue = f.absoluteValue
                        console.log(`Best Beam is Beam: ${f.properties.name}, ${f.properties.relativeGain} => ${f.absoluteValue} `)
                    }
                })
                return bestContour
            } else {
                console.log('This location is out of coverage of the given beam')
                return false
            }
        } catch (e) {
            console.log(e)
            return false
        }
    }

    static async getMultipleContourLines(arrayOfRequestObjects) {
        try {
            let arrayOfQueries = arrayOfRequestObjects.map(convertContourRequestObjectToGeojsonQuery)
            // Merge request with $or
            console.log(`Queries = ${JSON.stringify(arrayOfQueries)}`)
            let returnResults = await Contours2.find({ $or: arrayOfQueries })
            // return { contours: returnResults.map(c => {
            //     return {
            //         beam: c.properties.name,
            //         coords: c.geometry.coordinates[0].map(ring => {
            //             return {
            //                 lat: ring[1],
            //                 lng: ring[0]
            //             }
            //         })
            //     }
            // })}
            return { contours: returnResults }
        } catch (e) {
            console.log(e)
            return false
        }
    }

    static async getMultipleFarthestDatabaseContourLines(arrayOfRequestObjects) {
        try {
            console.log(JSON.stringify(arrayOfRequestObjects))
            let results = []
            for (let requestObject of arrayOfRequestObjects) {
                console.log(`Request object is ${requestObject}`)
                let contourResults = await Contours2.find(requestObject)
                // To get the max contour line, find the minimum relative gain among all lines
                let farthestLine = _.minBy(contourResults, re => {
                    return re.properties.relativeGain
                })
                console.log('Minimum line is ' + farthestLine.properties.relativeGain)
                results.push(farthestLine)
            }
            return { contours: results }
        } catch(e) {
            console.log(e)
            return null
        }
    }

    static async getMatchingReturnContour({satellite, beam, contourValue}) {
        let roundedValue = Math.round( contourValue * 10) / 10
        console.log(`Satellite = ${satellite}, Beam = ${beam}, Contour Value = ${roundedValue}`)
        let forwardContourQuery = {
            'properties.name': beam,
            'properties.satellite': satellite,
            'properties.path': 'forward',
            'properties.relativeGain': roundedValue

        }
        let returnContourQuery = {
            'properties.name': beam,
            'properties.satellite': satellite,
            'properties.path': 'return'
        }
        let forwardPolygon
        let forwardResults = await Contours2.find(forwardContourQuery)
        console.log(`Found ${forwardResults.length} polygon(s)`)
        forwardPolygon = forwardResults[0]
        try {
            let returnResults = await Contours2.find(returnContourQuery)
            // We will get every single contour lines of return beam here
            console.log(`Return results has ${returnResults.length} lines`)
            // Find the intersection of the forward
            let bestMatch = {}
            let leastDifferenceArea = 0
            returnResults.forEach(returnPolygon => {
                // let returnPolygon = turf.polygon([polygon.geometry.coordinates])
                // console.log(`Return Polygon = ${returnPolygon}`)
                // let difference = turf.difference(forwardPolygon, returnPolygon);
                let difference = turf.difference(returnPolygon, forwardPolygon);
                if (difference) {
                    var area = turf.area(difference);
                    if (leastDifferenceArea === 0 || area < leastDifferenceArea) {
                        leastDifferenceArea = area
                        bestMatch = returnPolygon
                    }
                    console.log(`The difference between forward ${contourValue} dB and return ${returnPolygon.properties.relativeGain} dB is ${area} sq.m.`)
                } else {
                    // console.log(`Can't find area difference`)
                }
                // console.log(`Intersection = ${JSON.stringify(difference, undefined, 2)}`)

                // console.log(`Area = ${area}`)
            })
            console.log(`The matching return contour is ${bestMatch.properties.relativeGain} dB`)
            return {bestMatch: bestMatch.properties.relativeGain}
        } catch (e) {
            console.log(e)
            return false
        }
    }

}

// Return object in this format
// { "properties.name": "206",
//   "properties.relativeGain": -0.1,
//   "properties.path": "forward",
//   "properties.parameter": "eirp" },
function convertContourRequestObjectToGeojsonQuery({ name, contourValue, satellite, satelliteType, path, isGatewayBeam, parameter }) {
    if (!(name && contourValue && satellite)) {
        return false
    }
    // If no satellite type given, assumes it is broadband by default
    satelliteType = satelliteType || 'Broadband'
    // If path is not given, assumes it's forward by default
    path = path || 'forward'
    // If parameter to query is not given, assume it's EIRP by default
    let parameterToQuery = parameter || 'eirp'
    // If this is broadband satellite, set parameter name to 'relativeGain', otherwise, set it to parameter to Query in case of conventional
    // This is how database stores the data name
    let parameterName = parameterToQuery
    if (satelliteType === 'Broadband') {
        parameterName = 'relativeGain'
    }
    // If isGateway beam is not given, assume it is false by default
    isGatewayBeam = isGatewayBeam || false
    // If this is broadband satellite, set parameter to query to either eirp or gt
    if (satelliteType === 'Broadband' && path === 'forward' && !isGatewayBeam) { // Forward, user beam => EIRP contour
        parameterToQuery = 'eirp'
    } else if (satelliteType === 'Broadband' && path === 'return' && !isGatewayBeam) { // Return, user beam => G/T contour
        parameterToQuery = 'gt'
    } else if (satelliteType === 'Broadband' && path === 'forward' && isGatewayBeam) { // Forward, Gateway Beam => G/T contour
        parameterToQuery = 'gt'
    } else if (satelliteType === 'Broadband' && path === 'return' && isGatewayBeam) { // Return, Gateway Beam => EIRP contour
        parameterToQuery = 'eirp'
    } else {

    }
    // Construct Query
    let query = {}
    query['properties.satellite'] = satellite
    query['properties.name'] = name
    query['properties.parameter'] = parameterToQuery
    query['properties.' + parameterName] = Utils.round(contourValue, 1)
    query['properties.path'] = path
    console.log(`Query = ${JSON.stringify(query)}`)
    return query
}

module.exports = Contour