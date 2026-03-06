const mongoose = require('mongoose');
require('dotenv').config();

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;

// Mock models (simplified) or Import them
const Product = require('./models/Product');
const Inward = require('./models/Inward');
const Production = require('./models/Production');
const Dispatch = require('./models/Dispatch');
const Order = require('./models/Order');

async function cleanDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('--- Cleaning Database ---');

        // Products (Raw Materials & Finished Goods)
        const productResult = await Product.deleteMany({});
        console.log(`Deleted ${productResult.deletedCount} Products (RM & FG)`);

        // Inward Records
        const inwardResult = await Inward.deleteMany({});
        console.log(`Deleted ${inwardResult.deletedCount} Inward records`);

        // Production Records
        const productionResult = await Production.deleteMany({});
        console.log(`Deleted ${productionResult.deletedCount} Production records`);

        // Dispatch Records
        const dispatchResult = await Dispatch.deleteMany({});
        console.log(`Deleted ${dispatchResult.deletedCount} Dispatch records`);

        // Order Records (Cleanup related entities)
        const orderResult = await Order.deleteMany({});
        console.log(`Deleted ${orderResult.deletedCount} Order records`);

        console.log('--- Cleanup Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanDB();
