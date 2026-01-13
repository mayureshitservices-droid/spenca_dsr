const Order = require('../models/Order');
const User = require('../models/User');
const ExcelJS = require('exceljs');

// GET /headoffice/dashboard
const getDashboard = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch salesperson stats
        const salespersonStats = await Order.aggregate([
            {
                $group: {
                    _id: '$salespersonId',
                    totalVisits: { $sum: 1 },
                    totalOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'Ordered'] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'salesperson'
                }
            },
            {
                $project: {
                    name: { $arrayElemAt: ['$salesperson.fullName', 0] },
                    totalVisits: 1,
                    totalOrders: 1
                }
            }
        ]);

        // Fetch ALL orders for charts and details
        const allOrders = await Order.find()
            .populate('salespersonId', 'fullName')
            .sort({ createdAt: -1 });

        res.render('headoffice/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            salespersonStats,
            allOrders
        });
    } catch (error) {
        console.error('Head Office Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /headoffice/download-report
const downloadDailyReport = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Build query
        const query = {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            orderStatus: { $in: ['Ordered', 'Visited'] } // Include both for full report
        };

        // If salespersonId is provided, filter by it
        if (req.query.salespersonId) {
            query.salespersonId = req.query.salespersonId;
        }

        const orders = await Order.find(query).populate('salespersonId', 'fullName');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Sales Report');

        // Columns: Salesperson Name, Customer Name, Mobile No, Product Name, Quantity, Rate
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Salesperson Name', key: 'salesperson', width: 20 },
            { header: 'Customer Name', key: 'customer', width: 25 },
            { header: 'Mobile No', key: 'mobile', width: 15 },
            { header: 'Product Name', key: 'product', width: 25 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Rate', key: 'rate', width: 10 },
            { header: 'Total Amount', key: 'total', width: 15 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC107' } // Yellow header
        };

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');

            if (order.products && order.products.length > 0) {
                // One row per product
                order.products.forEach(product => {
                    worksheet.addRow({
                        date: orderDate,
                        salesperson: order.salespersonId ? order.salespersonId.fullName : 'Unknown',
                        customer: order.customerName,
                        mobile: order.mobileNo,
                        product: product.productName,
                        quantity: product.quantity,
                        rate: product.rate || 0,
                        total: (product.quantity || 0) * (product.rate || 0)
                    });
                });
            } else {
                // Visit without product (or no products listed)
                worksheet.addRow({
                    date: orderDate,
                    salesperson: order.salespersonId ? order.salespersonId.fullName : 'Unknown',
                    customer: order.customerName,
                    mobile: order.mobileNo,
                    product: 'No Orders',
                    quantity: 0,
                    rate: 0,
                    total: 0
                });
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Daily_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel Export error:', error);
        res.status(500).send('Error generating report');
    }
};

module.exports = {
    getDashboard,
    downloadDailyReport
};
