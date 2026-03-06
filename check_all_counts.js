const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Inward = require('./models/Inward');
const Production = require('./models/Production');
const Dispatch = require('./models/Dispatch');
const Order = require('./models/Order');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const User = require('./models/User');
const CallLog = require('./models/CallLog');
const Campaign = require('./models/Campaign');
const CampaignContact = require('./models/CampaignContact');
const Device = require('./models/Device');

async function checkCounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const counts = {
            'Products (RM & FG)': await Product.countDocuments(),
            'Inward Records': await Inward.countDocuments(),
            'Production Records': await Production.countDocuments(),
            'Dispatch Records': await Dispatch.countDocuments(),
            'Orders': await Order.countDocuments(),
            'Customers': await Customer.countDocuments(),
            'Suppliers': await Supplier.countDocuments(),
            'Users': await User.countDocuments(),
            'CallLogs': await CallLog.countDocuments(),
            'Campaigns': await Campaign.countDocuments(),
            'CampaignContacts': await CampaignContact.countDocuments(),
            'Devices': await Device.countDocuments()
        };

        console.log(JSON.stringify(counts, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCounts();
