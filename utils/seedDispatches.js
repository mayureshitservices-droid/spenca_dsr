const mongoose = require('mongoose');
require('dotenv').config();
const Dispatch = require('../models/Dispatch');
const Product = require('../models/Product');
const User = require('../models/User');
const Customer = require('../models/Customer');

const seedDispatches = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // 1. Get/Create a dummy user (Head Office or Factory Incharge)
        let user = await User.findOne({ role: 'sysadmin' });
        if (!user) {
            user = await User.findOne();
        }

        // 2. Get/Create some products
        let products = await Product.find({ productType: 'Finished Good' }).limit(3);
        if (products.length === 0) {
            const p1 = new Product({ productName: 'Spenca 500ml', productType: 'Finished Good', factoryStock: { indapur: 100, shirapur: 100 } });
            const p2 = new Product({ productName: 'Spenca 1L', productType: 'Finished Good', factoryStock: { indapur: 150, shirapur: 150 } });
            await p1.save();
            await p2.save();
            products = [p1, p2];
        }

        // 3. Get/Create a customer
        let customer = await Customer.findOne();
        if (!customer) {
            customer = new Customer({
                customerName: 'Test Hotel',
                address: '123 Main St, Pune',
                mobileNo: '9876543210',
                category: 'Hotel',
                gstNo: '27ABCDE1234F1Z5'
            });
            await customer.save();
        }

        // 4. Create dispatches for "Yesterday" (current behavior of the report page)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(12, 0, 0, 0);

        const dispatches = [
            {
                productId: products[0]._id,
                productName: products[0].productName,
                quantity: 50,
                dispatchDate: yesterday,
                receiverName: customer.customerName,
                dcNo: 'DC/2024/001',
                vehicleNo: 'MH 12 AB 1234',
                driverName: 'John Doe',
                recordedBy: user._id,
                factory: 'indapur'
            },
            {
                productId: products[1]._id,
                productName: products[1].productName,
                quantity: 30,
                dispatchDate: yesterday,
                receiverName: customer.customerName,
                dcNo: 'DC/2024/002',
                vehicleNo: 'MH 12 AB 1234',
                driverName: 'John Doe',
                recordedBy: user._id,
                factory: 'indapur'
            },
            {
                productId: products[0]._id,
                productName: products[0].productName,
                quantity: 20,
                dispatchDate: yesterday,
                receiverName: 'Another Customer',
                dcNo: 'DC/2024/003',
                vehicleNo: 'MH 13 XY 5678',
                driverName: 'Jane Smith',
                recordedBy: user._id,
                factory: 'shirapur'
            }
        ];

        await Dispatch.insertMany(dispatches);
        console.log('✅ 3 Sample dispatches created for yesterday.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding dispatches:', error);
        process.exit(1);
    }
};

seedDispatches();
