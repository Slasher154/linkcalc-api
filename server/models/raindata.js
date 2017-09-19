/**
 * Created by thanatv on 9/19/17.
 */

const mongoose = require('mongoose');
const RainData = mongoose.model('rain_data', new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    lat: Number,
    lon: Number,
    value: Number
}), 'rain_data'); // specify 3rd argument as real collection name in mongodb otherwise mongoose will expect the collection names to be 'rain_datas'

module.exports = {RainData};