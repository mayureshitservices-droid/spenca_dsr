const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const conversionRates = {
    '1 Ltr P': 12,
    '500 Ml P': 24,
    '250 Ml P': 40,
    '1 Ltr S': 12,
    '500 Ml S': 24,
    '200 Ml S': 48,
    '1 Ltr R': 12,
    '500 Ml R': 24,
    '2 Ltr R': 6,
    '1 Ltr A': 12
};

async function migrateData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ productType: 'Finished Good' });

        for (const product of products) {
            let multiplier = 1;
            // Try to find a match in the name
            for (const [name, rate] of Object.entries(conversionRates)) {
                if (product.productName.toLowerCase().includes(name.toLowerCase())) {
                    multiplier = rate;
                    break;
                }
            }

            console.log(`Updating ${product.productName}: Multiplier=${multiplier}, Old Qty=${product.availableQty}`);

            // Convert current qty to boxes
            const currentQty = product.availableQty || 0;
            const boxes = Math.floor(currentQty / multiplier);

            product.uom = 'Box';
            product.packaging = multiplier.toString();
            product.availableQty = boxes;

            await product.save();
            console.log(`-> Updated: New Qty=${boxes} Boxes`);
        }

        console.log('Migration completed.');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

migrateData();
