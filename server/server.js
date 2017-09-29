const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const ObjectID = require('mongodb').ObjectID;
const path = require('path');
const moment = require('moment');
const routes = require('./routes');


var mongoose = require('./db/mongoose').mongoose;
var LinkRequests = require('./models/link_requests').LinkRequests;

var expressVue = require('express-vue');
var cors = require('cors');

var app = express();

app.use(cors());

const port = process.env.PORT || 23324;

const vueOptions = {
    rootPath: path.join(__dirname, '../views'),
    layout: {
        start: '<div id="app">',
        end: '</div>'
    }
}

const expressVueMiddleware = expressVue.init(vueOptions);
app.use(expressVueMiddleware);

app.use(bodyParser.json());

app.use('/', routes);

// app.get('/', (req, res) => {
//     res.send('Hello world!');
// });

app.get('/requests', (req, res) => {
    let requests = [];

    LinkRequests.find({}, { _id: 1, assumptions: 1, requestor_name: 1, requested_date: 1}, { sort: { requested_date: -1 }, limit: 50 }).then((reqs) => {
        // console.log(reqs[0]);
        // reqs.forEach(r => r.formatted_date = moment(r.requested_date).format("MM Do, YYYY  HH:mm"));
        reqs.forEach((r) => {
            // console.log('date = ' + r.requested_date);
            r.formatted_date = moment(r.requested_date).format("MMMM Do, YYYY - HH:mm")
            // console.log('formatted date = ' + r.formatted_date);
        });
        console.log(JSON.stringify(reqs[0].formatted_date));
        const data = {
            otherData: 'Something Else',
            requests: reqs,
        };
        const vueOptions = {
            head: {
                title: 'Page Title',
                meta: [
                    { property: 'og:title', content: 'Page Title' },
                    { name: 'twitter:title', content: 'Page Title' },
                    // { script: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js' },
                    { script: 'https://unpkg.com/vue' },
                    { style: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css' }
                ]
            }
        }
        res.renderVue('main', data, vueOptions);
    })
});


app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

module.exports.app = app;
