/**
 * Created by thanatv on 9/19/17.
 */

const _ = require('lodash');
const rainDataRouter = require('express').Router();

const {RainData} = require('../../models/raindata');

// return rain data from given lat/lon

rainDataRouter.post('/rainValue', (req, res) => {
    const lat = req.body.lat, lon = req.body.lon;
    let result = getFourCornersOfSquare(lat, lon);
    let x1,x2,y1,y2;
    if (result) {
        x1 = result.x1, x2 = result.x2, y1 = result.y1, y2 = result.y2;
    } else {
        res.status(404).send('Lat/Lon is invalid');
    } pr

    // Query 4 rain points
    RainData.find({ lat: { $in: [y1, y2] }, lon: { $in: [x1, x2]}}).then((rainPoints) => {
        console.log(JSON.stringify(rainPoints, undefined, 2));

        let f11 = findRainValueAtPoint(rainPoints, x1, y1),
            f12 = findRainValueAtPoint(rainPoints, x1, y2),
            f21 = findRainValueAtPoint(rainPoints, x2, y1),
            f22 = findRainValueAtPoint(rainPoints, x2, y2);

        let fxy1 = linearInterpolation(lon, x1, x2, f11, f21);
        let fxy2 = linearInterpolation(lon, x1, x2, f12, f22);

        // Linear interpolation fxy1,fxy2 in the y-axis
        var rainValue = linearInterpolation(lat, y1, y2, fxy1, fxy2);

        console.log('topLeft = ' + f12 + ' topRight = ' + f22 + ' bottomLeft = ' + f11 + ' bottomRight = ' + f21);
        console.log('Rain 001 = ' + rainValue);

        // res.status(200).send({locations});
        res.status(200).send({rainValue});
    }).catch((e) => {
        res.status(404).send(e);
    });

});

function findRainValueAtPoint(points, lon, lat) {
    return points.find(p => p.lat === lat && p.lon === lon).value;
}

function getFourCornersOfSquare(lat, lon) {
    // check if lat,lon is valid
    if (lat > 90 || lat < -90 || lon > 180 || lon < -180) {
        return null;
    }
    // the database grid contains lat/lon at 1.5 degree step, so find the 2 lat and 2 lons which are closest to the given point
    var x_lat = Math.floor(lat / 1.5);
    var x_lon = Math.floor(lon / 1.5);
    var y1 = x_lat * 1.5;
    var y2 = (x_lat + 1) * 1.5;
    var x1 = x_lon * 1.5;
    var x2 = (x_lon + 1) * 1.5;

    return {
        x1, x2, y1, y2
    };
}

function linearInterpolation(x, x1, x2, fx1, fx2) {
    return ((fx2 - fx1) / (x2 - x1)) * (x - x1) + fx1;
}

module.exports = rainDataRouter;