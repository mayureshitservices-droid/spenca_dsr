const mongoose = require('mongoose');
const CallLog = require('./models/CallLog');
require('dotenv').config();

async function checkStatuses() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Checking last 10 call logs...');
    const logs = await CallLog.find().sort({ timestamp: -1 }).limit(10);
    logs.forEach(log => {
        console.log(`Device: ${log.deviceId}, Status: ${log.callStatus}, Phone: ${log.phoneNumber}`);
    });
    await mongoose.disconnect();
}

checkStatuses().catch(console.error);
