const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const path = require('path');


var {mongoose} = require('./db/mongoose');
var {LinkRequests} = require('./models/link_requests');

var expressVue = require('express-vue');

var app = express();
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

app.get('/', (req, res) => {
    res.send('Hello world!');
});

app.get('/requests', (req, res) => {
    let requests = [];

    LinkRequests.find({}, { _id: 1, assumptions: 1, requestor_name: 1, requested_date: 1}, { sort: { requested_date: -1 }, limit: 50 }).then((reqs) => {
        // console.log(reqs[0]);
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

module.exports = {app};
