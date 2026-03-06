const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const coreProducts = [
    '1 Ltr P',
    '500 Ml P',
    '250 Ml P',
    '1 Ltr S',
    '500 Ml S',
    '200 Ml S',
    '1 Ltr R',
    '500 Ml R',
    '2 Ltr R',
    '1 Ltr A'
];

async function removeCoreProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const result = await Product.deleteMany({ productName: { $in: coreProducts } });
        console.log(`Successfully removed ${result.deletedCount} core products.`);

    } catch (error) {
        console.error('Error removing products:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

removeCoreProducts();
