const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Production = require('./models/Production');
const Dispatch = require('./models/Dispatch');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const pid = '697c3b32a025e87dd34ec690';
    const product = await Product.findById(pid);
    console.log('Current availableQty:', product.availableQty);

    const prods = await Production.find({ productId: pid });
    const disps = await Dispatch.find({ productId: pid });
    const totalProd = prods.reduce((acc, p) => acc + p.quantity, 0);
    const totalDisp = disps.reduce((acc, d) => acc + d.quantity, 0);
    console.log(`Productions: ${prods.length} entries, total: ${totalProd}`);
    console.log(`Dispatches:  ${disps.length} entries, total: ${totalDisp}`);
    console.log(`Expected FG if started at 0: ${totalProd - totalDisp}`);
    console.log(`--- Latest 3 dispatches ---`);
    const recent = await Dispatch.find({ productId: pid }).sort({ createdAt: -1 }).limit(3);
    recent.forEach(d => console.log(`  ${d.createdAt.toISOString()} | Qty: ${d.quantity}`));
    await mongoose.disconnect();
});
