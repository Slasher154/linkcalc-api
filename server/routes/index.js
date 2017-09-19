/**
 * Created by thanatv on 9/18/17.
 */

const routes = require('express').Router();

// import all API v1 routes
const v1routes = require('./v1/index');

// register all API v1 routes
routes.use(v1routes);

// other routes
routes.get('/', (req, res) => {
    res.status(200).json({ message: 'Connected!' });
});

module.exports = routes;