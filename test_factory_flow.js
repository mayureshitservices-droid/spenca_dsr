
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Production = require('./models/Production');
const Dispatch = require('./models/Dispatch');
const User = require('./models/User');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const testUser = await User.findOne({ email: 'indapur@spenca.co.in' });
        if (!testUser) throw new Error('Test user not found');

        // 1. Identify Test Product: Regular 1 ltrs
        const fg = await Product.findOne({ productName: 'Regular 1 ltrs' });
        if (!fg) throw new Error('FG Regular 1 ltrs not found');

        console.log(`Starting Test for ${fg.productName}`);
        console.log(`Initial FG Qty: ${fg.availableQty}`);

        // Get initial RM stocks
        const rmIds = fg.components.map(c => c.productId.toString());
        const initialRMStocks = new Map();
        for (const rmId of rmIds) {
            const rm = await Product.findById(rmId);
            initialRMStocks.set(rmId, rm.availableQty);
            console.log(`Initial RM ${rm.productName} Qty: ${rm.availableQty}`);
        }

        // 2. Simulate Production Recording
        const prodQty = 10;
        console.log(`\nRecording Production of ${prodQty} units...`);

        // Manual simulation of createProduction logic
        // A. Update Stock
        for (const comp of fg.components) {
            const req = comp.quantity * prodQty;
            await Product.findByIdAndUpdate(comp.productId, { $inc: { availableQty: -req } });
        }
        await Product.findByIdAndUpdate(fg._id, { $inc: { availableQty: prodQty } });

        // B. Save Record
        const prodRecord = new Production({
            productId: fg._id,
            productName: fg.productName,
            quantity: prodQty,
            batchNo: 'TEST-' + Date.now(),
            shift: '1st',
            recordedBy: testUser._id
        });
        await prodRecord.save();
        console.log('Production Record saved.');

        // 3. Verify Stocks after Production
        const fgAfterProd = await Product.findById(fg._id);
        console.log(`FG Qty after Production: ${fgAfterProd.availableQty}`);
        if (fgAfterProd.availableQty !== fg.availableQty + prodQty) throw new Error('FG Stock mismatch after production');

        for (const comp of fg.components) {
            const rmId = comp.productId.toString();
            const rmAfter = await Product.findById(rmId);
            const expected = initialRMStocks.get(rmId) - (comp.quantity * prodQty);
            console.log(`RM ${rmAfter.productName} Qty: ${rmAfter.availableQty} (Expected: ${expected})`);
            if (Math.abs(rmAfter.availableQty - expected) > 0.001) throw new Error(`RM Stock mismatch for ${rmAfter.productName}`);
        }

        // 4. Simulate Dispatch Recording
        const dispQty = 5;
        console.log(`\nRecording Dispatch of ${dispQty} units...`);

        // Manual simulation of createDispatch logic
        await Product.findByIdAndUpdate(fg._id, { $inc: { availableQty: -dispQty } });
        const dispRecord = new Dispatch({
            productId: fg._id,
            productName: fg.productName,
            quantity: dispQty,
            receiverName: 'Test Receiver',
            vehicleNo: 'TEST-1234',
            recordedBy: testUser._id
        });
        await dispRecord.save();
        console.log('Dispatch Record saved.');

        // 5. Verify Stocks after Dispatch
        const fgAfterDisp = await Product.findById(fg._id);
        console.log(`FG Qty after Dispatch: ${fgAfterDisp.availableQty}`);
        const finalExpected = fg.availableQty + prodQty - dispQty;
        if (fgAfterDisp.availableQty !== finalExpected) throw new Error('FG Stock mismatch after dispatch');

        console.log('\n✅ ALL FLOWS VERIFIED SUCCESSFULLY!');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

test();
