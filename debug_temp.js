const mongoose = require('mongoose');

// Connect to MongoDB (Hardcoding connection string for test or getting from env if possible, assuming local for now since user is on localhost)
// WARNING: We need the connection string. Usually it's in process.env.MONGODB_URI or config.
// I will assume standard localhost or try to find it in app.js.

const Inward = require('./models/Inward');
const Dispatch = require('./models/Dispatch');
const Product = require('./models/Product');

async function testQueries() {
    try {
        console.log('Connecting to DB...');
        // Assuming default local mongo or we need to find the URI. 
        // Let's look for app.js first to see how it connects.
        // But for now I'll write this file and then checking app.js before running it.
    } catch (err) {
        console.error(err);
    }
}
