const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

async function listPreforms() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const preforms = await Product.find({
            productName: { $regex: /preform/i }
        });

        console.log('--- Current Preforms ---');
        preforms.forEach(p => {
            console.log(`- ${p.productName} (ID: ${p._id})`);
        });
        if (preforms.length === 0) console.log('No preforms found.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

listPreforms();
