const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const coreProducts = [
    { name: '1 Ltr P', unitsPerBox: 12 },
    { name: '500 Ml P', unitsPerBox: 24 },
    { name: '250 Ml P', unitsPerBox: 40 },
    { name: '1 Ltr S', unitsPerBox: 12 },
    { name: '500 Ml S', unitsPerBox: 24 },
    { name: '200 Ml S', unitsPerBox: 48 },
    { name: '1 Ltr R', unitsPerBox: 12 },
    { name: '500 Ml R', unitsPerBox: 24 },
    { name: '2 Ltr R', unitsPerBox: 6 },
    { name: '1 Ltr A', unitsPerBox: 12 }
];

async function seedCoreProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        for (const item of coreProducts) {
            // Check if it already exists
            const existing = await Product.findOne({ productName: item.name });
            if (existing) {
                // Update if it exists to ensure packaging is set correctly based on new logic
                existing.packaging = `${item.unitsPerBox} nos/box`;
                existing.productType = 'Finished Good';
                existing.uom = 'Box'; // We'll set the primary UOM to Box as requested
                await existing.save();
                console.log(`Updated existing product: ${item.name}`);
            } else {
                // Create new
                const product = new Product({
                    productName: item.name,
                    productType: 'Finished Good',
                    uom: 'Box',
                    packaging: `${item.unitsPerBox} nos/box`,
                    availableQty: 0,
                    isBranded: false
                });
                await product.save();
                console.log(`Created new product: ${item.name}`);
            }
        }

        console.log('Finished seeding core products.');
    } catch (error) {
        console.error('Error seeding products:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedCoreProducts();
