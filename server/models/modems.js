/**
 * Created by thanatv on 9/19/17.
 */

var mongoose = require('mongoose');

var Modems = mongoose.model('modems', new mongoose.Schema({
   _id: {
       type: String,
   },
   name: {
       type: String,
       required: true
   },
    vendor: {
       type: String,
       required: true
    },
    warning_messages: Array,
    applications: Array

}));

module.exports = {Modems};