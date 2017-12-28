/**
 * Created by thanatv on 9/19/17.
 */

var mongoose = require('mongoose');

var AntennaVendors = mongoose.model('antenna_vendors', new mongoose.Schema({
   _id: {
       type: String,
       required: true
   },
   name: {
       type: String,
       required: true
   }

}));

module.exports = {AntennaVendors};