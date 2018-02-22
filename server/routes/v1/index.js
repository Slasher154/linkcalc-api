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

// Antenna routes
const antennaRoutes = require('./antennas');
v1routes.use(version, antennaRoutes);

// Antenna vendor routes
const antennaVendorRoutes = require('./antenna-vendors');
v1routes.use(version, antennaVendorRoutes);

// Buc routes
const bucRoutes = require('./bucs');
v1routes.use(version, bucRoutes);

// Modem routes
const modemRoutes = require('./modems');
v1routes.use(version, modemRoutes);

// Modem vendor routes
const modemVendorRoutes = require('./modem-vendors');
v1routes.use(version, modemVendorRoutes);

// Location routes
const locationRoutes = require('./locations');
v1routes.use(version, locationRoutes);

// Rain data routes
const rainDataRoutes = require('./raindata');
v1routes.use(version, rainDataRoutes);

// Saved Requests routes
const savedRequestRoutes = require('./saved-requests');
v1routes.use(version, savedRequestRoutes);

// Contour routes
const contourRoutes = require('./contours');
v1routes.use(version, contourRoutes);

// Constant routes
const constantRoutes = require('./constants');
v1routes.use(version, constantRoutes);

// Contours migration routes
// const contourMigrationRoutes = require('./contourMigration');
// v1routes.use(version, contourMigrationRoutes);


module.exports = v1routes;