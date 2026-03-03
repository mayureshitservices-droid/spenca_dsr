/**
 * Script to reconcile FG stock by re-deriving it from Production and Dispatch records.
 * This is a one-time fix because some dispatches happened when the deduction was not working.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Production = require('./models/Production');
const Dispatch = require('./models/Dispatch');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    // Get all Finished Good products
    const fgProducts = await Product.find({ productType: 'Finished Good' });

    for (const product of fgProducts) {
        const pid = product._id;
        const prods = await Production.find({ productId: pid });
        const disps = await Dispatch.find({ productId: pid });

        // Sum productions that happened AFTER we started tracking (Feb 25 and later)
        // Only count new-system productions (those recorded via our new feature)
        const newSysProds = prods.filter(p => p.createdAt >= new Date('2026-02-25'));
        const newSysDisps = disps.filter(d => d.createdAt >= new Date('2026-02-25'));

        const totalProduced = newSysProds.reduce((acc, p) => acc + p.quantity, 0);
        const totalDispatched = newSysDisps.reduce((acc, d) => acc + d.quantity, 0);
        const correctQty = totalProduced - totalDispatched;

        console.log(`\nProduct: ${product.productName}`);
        console.log(`  Current availableQty:  ${product.availableQty}`);
        console.log(`  New-system Productions: ${totalProduced} (${newSysProds.length} records)`);
        console.log(`  New-system Dispatches:  ${totalDispatched} (${newSysDisps.length} records)`);
        console.log(`  Correct availableQty:   ${correctQty}`);

        if (product.availableQty !== correctQty) {
            await Product.findByIdAndUpdate(pid, { availableQty: correctQty });
            console.log(`  ✅ CORRECTED from ${product.availableQty} to ${correctQty}`);
        } else {
            console.log(`  ✓ Already correct`);
        }
    }

    console.log('\nDone!');
    await mongoose.disconnect();
});
