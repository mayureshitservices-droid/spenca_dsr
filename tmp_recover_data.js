const mongoose = require('mongoose');
require('dotenv').config();
const CallLog = require('./models/CallLog');

async function testRetrieve() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const logs = await CallLog.find({
            $or: [
                { outcome: 'Ordered' },
                { productQuantities: { $exists: true, $ne: {} } }
            ]
        }).select('customerName phoneNumber outcome productQuantities timestamp').sort({ timestamp: -1 });

        console.log(`Found ${logs.length} potential orders in CallLogs`);
        if (logs.length > 0) {
            console.log('Sample Data:');
            console.log(JSON.stringify(logs.slice(0, 3), null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testRetrieve();
