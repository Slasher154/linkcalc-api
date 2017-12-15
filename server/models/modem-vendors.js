/**
 * Created by thanatv on 9/19/17.
 */

var mongoose = require('mongoose');

var ModemVendors = mongoose.model('modem_vendors', new mongoose.Schema({
   _id: {
       type: String,
       required: true
   },
   name: {
       type: String,
       required: true
   }

}));

module.exports = {ModemVendors};