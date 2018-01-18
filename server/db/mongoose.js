var mongoose = require('mongoose');

// Tell mongoose we want to use built-in promise, not 3rd party promise
mongoose.Promise = Promise;

// Mongoose maintains connection for us, no need to use callback like MongoClient
mongoose.connect(process.env.MONGO_URL);

module.exports.mongoose = mongoose;
