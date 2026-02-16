require('dotenv').config();
const mongoose = require('mongoose');
const Inward = require('./models/Inward');
const Dispatch = require('./models/Dispatch');
const Product = require('./models/Product'); // Needed for population

async function run() {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Fetching Inward...');
        const inward = await Inward.find().populate('productId').limit(5);
        console.log(`Found ${inward.length} inward records.`);
        inward.forEach((i, idx) => {
            console.log(`[${idx}] Product: ${i.productId ? i.productId.productName : 'NULL'} (ID: ${i.productId ? i.productId._id : i.productId})`);
        });

        console.log('Fetching Dispatch...');
        const dispatch = await Dispatch.find().populate('productId').limit(5);
        console.log(`Found ${dispatch.length} dispatch records.`);
        dispatch.forEach((d, idx) => {
            console.log(`[${idx}] Product: ${d.productId ? d.productId.productName : 'NULL'} (ID: ${d.productId ? d.productId._id : d.productId})`);
        });

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

run();
