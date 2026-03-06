const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ productType: 'Finished Good' }).limit(5);
        console.log('--- Finished Goods Sample ---');
        products.forEach(p => {
            console.log(`Name: ${p.productName}, UOM: ${p.uom}, Packaging: ${p.packaging}`);
            console.log('Components:', JSON.stringify(p.components, null, 2));
            console.log('-----------------------------');
        });

        const raw = await Product.find({ productType: 'Raw Material' }).limit(3);
        console.log('--- Raw Materials Sample ---');
        raw.forEach(r => {
            console.log(`Name: ${r.productName}, UOM: ${r.uom}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkProducts();
