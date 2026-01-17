const connectDB = require('./config/database');

async function check() {
    try {
        await connectDB();
        const Order = require('./models/Order');

        console.log('--- ALL RECORDS IN RANGE 01-01-2026 TO 17-01-2026 ---');
        const start = new Date(2026, 0, 1, 0, 0, 0, 0);
        const end = new Date(2026, 0, 17, 23, 59, 59, 999);

        const records = await Order.find({
            createdAt: { $gte: start, $lte: end }
        }).select('customerName createdAt orderStatus salespersonId');

        console.log(`Found ${records.length} records`);
        records.forEach(r => {
            console.log(`- ${r.customerName} | ${r.createdAt.toISOString()} | Status: ${r.orderStatus} | Salesperson: ${r.salespersonId}`);
        });

        const allStatuses = await Order.distinct('orderStatus');
        console.log('\nAll unique statuses in DB:', allStatuses);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
