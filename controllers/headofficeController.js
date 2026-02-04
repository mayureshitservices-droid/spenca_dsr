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
        const { startDate, endDate, salespersonId } = req.query;

        // Build query
        const query = {};

        let reportName = 'Daily_Sales_Report';

        // Check if dates are valid non-empty strings and not "undefined"
        const hasValidDates = startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined';

        if (hasValidDates) {
            const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
            const [eYear, eMonth, eDay] = endDate.split('-').map(Number);

            // Explicitly set to local time boundaries
            const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
            const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                query.createdAt = { $gte: start, $lte: end };
                reportName = `DSR_${startDate}_to_${endDate}`;
            } else {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);
                query.createdAt = { $gte: startOfDay, $lte: endOfDay };
            }
        } else {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
            reportName = `DSR_${new Date().toISOString().split('T')[0]}`;
        }

        // If salespersonId is provided, filter by it
        if (salespersonId) {
            query.salespersonId = salespersonId;
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
            const d = new Date(order.createdAt);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const orderDate = `${day}/${month}/${year}`;

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
        res.setHeader('Content-Disposition', `attachment; filename=${reportName}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel Export error:', error);
        res.status(500).send('Error generating report');
    }
};

// GET /headoffice/telecrm
const getTeleCRM = async (req, res) => {
    try {
        const { fetchDevicesWithStats } = require('./telecrmController');
        const devices = await fetchDevicesWithStats();

        res.render('headoffice/telecrm', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            devices
        });
    } catch (error) {
        console.error('TeleCRM error:', error);
        res.render('headoffice/telecrm', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            devices: []
        });
    }
};

// GET /headoffice/telecrm/export/:deviceId
const exportTeleCRM = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { startDate, endDate } = req.query;
        const Device = require('../models/Device');
        const CallLog = require('../models/CallLog');
        const Order = require('../models/Order');

        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).send('Device not found');
        }

        // Build query
        const query = { deviceId };
        if (startDate && endDate) {
            const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
            const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
            const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                query.timestamp = { $gte: start, $lte: end };
            }
        }

        const logs = await CallLog.find(query).sort({ timestamp: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Call History');

        worksheet.columns = [
            { header: 'Date & Time', key: 'timestamp', width: 25 },
            { header: 'Duration', key: 'duration', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Mobile Number', key: 'phoneNumber', width: 15 },
            { header: 'Distributor', key: 'distributor', width: 20 },
            { header: 'Call Status', key: 'callStatus', width: 15 },
            { header: 'Outcome', key: 'outcome', width: 15 },
            { header: 'Reminder Date', key: 'reminder', width: 15 },
            { header: 'Order Details', key: 'orderDetails', width: 30 },
            { header: 'Notes & Remarks', key: 'remarks', width: 40 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1C2574' } // Dark blue header
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Helper for duration (copied from telecrmController)
        const formatDur = (totalSeconds) => {
            if (!totalSeconds || totalSeconds < 0) return '0s';
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) return `${hours}h ${minutes}m`;
            if (minutes > 0) return `${minutes}m ${seconds}s`;
            return `${seconds}s`;
        };

        for (const log of logs) {
            // Enrichment Logic (matches telecrmController.fetchDevicesWithStats)
            let customerName = log.customerName;
            let outcome = log.outcome;
            let reminder = log.followUpDate;
            let orderDetails = log.productQuantities && Object.keys(log.productQuantities).length > 0
                ? Object.entries(log.productQuantities).map(([p, q]) => `${p} (x${q})`).join(', ')
                : null;
            let distributor = log.distributor;

            if (!outcome || outcome === 'No Interaction') {
                const latestOrder = await Order.findOne({ mobileNo: log.phoneNumber })
                    .sort({ createdAt: -1 });

                if (latestOrder) {
                    customerName = customerName || latestOrder.customerName;
                    outcome = outcome === 'No Interaction' ? latestOrder.orderStatus : outcome;
                    reminder = reminder || latestOrder.tentativeRepeatDate;
                    orderDetails = orderDetails || (latestOrder.products ? latestOrder.products.map(p => `${p.productName} (x${p.quantity})`).join(', ') : 'N/A');
                }
            }

            worksheet.addRow({
                timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A',
                duration: formatDur(log.duration),
                customerName: customerName || 'New Customer',
                phoneNumber: log.phoneNumber || 'N/A',
                distributor: distributor || 'None',
                callStatus: log.callStatus || 'N/A',
                outcome: outcome || 'No Interaction',
                reminder: reminder ? new Date(reminder).toLocaleDateString('en-IN') : 'None',
                orderDetails: orderDetails || 'None',
                remarks: log.remarks || 'No notes'
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=TeleCRM_${device.telecaller}_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('TeleCRM Export error:', error);
        res.status(500).send('Error generating report');
    }
};

module.exports = {
    getDashboard,
    downloadDailyReport,
    getTeleCRM,
    exportTeleCRM
};
