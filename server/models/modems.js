/**
 * Created by thanatv on 9/19/17.
 */

var mongoose = require('mongoose');

let modemSchema = new mongoose.Schema({
    _id: String,
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

})

modemSchema.pre('update', () => {
    this.update({}, { $set: { updatedAt: new Date() }})
})

var Modems = mongoose.model('modems', modemSchema);

module.exports = {Modems};