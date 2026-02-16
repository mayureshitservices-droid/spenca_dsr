require('dotenv').config();
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    supplierName: String,
    name: String
}, { strict: false });

const Supplier = mongoose.model('Supplier', supplierSchema);

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Supplier.updateMany(
            { name: { $exists: true } },
            [
                { $set: { supplierName: '$name' } },
                { $unset: 'name' }
            ]
        );

        console.log('Migration Result:', result);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
