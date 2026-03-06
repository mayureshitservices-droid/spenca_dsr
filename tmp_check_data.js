const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find().populate('brandedCustomerId');

        products.forEach(p => {
            if (p.isBranded) {
                console.log(`Product: ${p.productName}, isBranded: ${p.isBranded}`);
                console.log(`brandedCustomerId type: ${typeof p.brandedCustomerId}`);
                console.log(`brandedCustomerId value: ${p.brandedCustomerId}`);
                if (p.brandedCustomerId && !p.brandedCustomerId.customerName) {
                    console.log('--- POTENTIAL ISSUE: customerName is missing! ---');
                }
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
