/**
 * Created by thanatv on 9/19/17.
 */

const v1routes = require('express').Router();
const version = '/v1';

// Linkbudget routes
const linkbudgetRoutes = require('./linkbudget');
v1routes.use(version, linkbudgetRoutes);

// Adjacent Satellite routes
const adjSatRoutes = require('./adjacent_satellites')
v1routes.use(version, adjSatRoutes);

// Satellite routes
const satelliteRoutes = require('./satellites');
v1routes.use(version, satelliteRoutes);

// Beam routes
const beamRoutes = require('./beams');
v1routes.use(version, beamRoutes);

// Location routes
const transponderRoutes = require('./transponders');
v1routes.use(version, transponderRoutes);

// Gateway routes
const gatewayRoutes = require('./gateways');
v1routes.use(version, gatewayRoutes);

// Buc routes
const antennaRoutes = require('./antennas');
v1routes.use(version, antennaRoutes);

// Buc routes
const bucRoutes = require('./bucs');
v1routes.use(version, bucRoutes);

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