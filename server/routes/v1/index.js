/**
 * Created by thanatv on 9/19/17.
 */

const v1routes = require('express').Router();
const version = '/v1';


// Satellite routes
const satelliteRoutes = require('./satellites');
v1routes.use(version, satelliteRoutes);

// Beam routes
const beamRoutes = require('./beams');
v1routes.use(version, beamRoutes);

// Transponder routes
const transponderRoutes = require('./transponders');
v1routes.use(version, transponderRoutes);

// Modem routes
const modemRoutes = require('./modems');
v1routes.use(version, modemRoutes);

// Location routes
const locationRoutes = require('./locations');
v1routes.use(version, locationRoutes);

// Rain data routes
const rainDataRoutes = require('./raindata');
v1routes.use(version, rainDataRoutes);

module.exports = v1routes;