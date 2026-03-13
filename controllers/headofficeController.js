const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Production = require('../models/Production');
const Inward = require('../models/Inward');
const Dispatch = require('../models/Dispatch');
const ProductionPlan = require('../models/ProductionPlan');
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
            devices,
            extraFabItems: [
                {
                    label: 'Manage Campaigns',
                    icon: 'megaphone',
                    onClick: "window.location.href='/headoffice/telecrm/campaigns'"
                }
            ]
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

// GET /headoffice/ims
const getIMS = async (req, res) => {
    try {
        const query = {};

        const Product = require('../models/Product');
        const Customer = require('../models/Customer');
        const Inward = require('../models/Inward');
        const Dispatch = require('../models/Dispatch');
        const Production = require('../models/Production');

        // Fetch raw materials for stock view
        const rawMaterials = await Product.find({ productType: 'Raw Material' }).sort({ productName: 1 });

        // Fetch finished goods for stock view
        const finishedGoods = await Product.find({ productType: 'Finished Good' }).sort({ productName: 1 });

        // Fetch customers
        const customers = await Customer.find().sort({ customerName: 1 });

        // Fetch suppliers
        const suppliers = await Supplier.find().sort({ supplierName: 1 });

        // Fetch Inward History
        const inwardTransactions = await Inward.find(query)
            .populate('productId')
            .sort({ createdAt: -1 });

        // Fetch Dispatch History
        const dispatchTransactions = await Dispatch.find(query)
            .populate('productId')
            .sort({ dispatchDate: -1 });

        // Fetch Production History
        const productionRecords = await Production.find(query)
            .populate('productId')
            .sort({ createdAt: -1 });

        res.render('headoffice/ims', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            rawMaterials,
            finishedGoods,
            suppliers,
            customers,
            inwardTransactions,
            dispatchTransactions,
            productionRecords,
            extraFabItems: [
                {
                    label: 'Run MRP',
                    icon: 'calculator',
                    onClick: "showSection('mrp-section')"
                }
            ]
        });
    } catch (error) {
        console.error('IMS Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// POST /headoffice/suppliers/create
const createSupplier = async (req, res) => {
    try {
        const { supplierName, address, phoneNumber, gstNo, paymentTerms, status } = req.body;

        const existingSupplier = await Supplier.findOne({ supplierName });
        if (existingSupplier) {
            return res.status(400).send('Supplier with this name already exists');
        }

        const supplier = new Supplier({
            supplierName,
            address,
            phoneNumber,
            gstNo,
            paymentTerms,
            status
        });

        await supplier.save();
        res.redirect('/headoffice/ims#suppliers-section');
    } catch (error) {
        console.error('Create Supplier error:', error);
        res.status(500).send('Server error');
    }
};

// POST /headoffice/customers/create
const createCustomer = async (req, res) => {
    try {
        const { customerName, address, mobileNo, category, gstNo, paymentTerms, status, customerType } = req.body;

        const existingCustomer = await Customer.findOne({ customerName });
        if (existingCustomer) {
            return res.status(400).send('Customer with this name already exists');
        }

        const customer = new Customer({
            customerName,
            address,
            mobileNo,
            category,
            gstNo,
            paymentTerms,
            status,
            customerType
        });

        await customer.save();
        res.redirect('/headoffice/ims#customers-section');
    } catch (error) {
        console.error('Create Customer error:', error);
        res.status(500).send('Server error');
    }
};

const getCampaigns = async (req, res) => {
    try {
        const Campaign = require('../models/Campaign');
        const Device = require('../models/Device');

        // Fetch all campaigns with stats
        const campaigns = await Campaign.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'deviceId',
                model: 'Device',
                localField: 'deviceId',
                foreignField: 'deviceId',
                select: 'deviceName telecaller'
            });

        // Fetch all devices for the "Assign" dropdown
        const devices = await Device.find().sort({ deviceName: 1 });

        res.render('headoffice/campaigns', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            campaigns,
            devices,
            extraFabItems: [
                {
                    label: 'Assign New',
                    icon: 'plus-circle',
                    onClick: 'openCampaignModal()'
                },
                {
                    label: 'Manage Devices',
                    icon: 'smartphone',
                    onClick: "window.location.href='/headoffice/telecrm'"
                }
            ]
        });
    } catch (error) {
        console.error('Get campaigns page error:', error);
        res.status(500).send('Server error');
    }
};

const getRawMaterialStock = async (req, res) => {
    try {
        const rawMaterials = await Product.find({ productType: 'Raw Material' }).sort({ productName: 1 });
        res.render('headoffice/raw-material-stock', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            rawMaterials,
            title: 'Raw Material Stock'
        });
    } catch (error) {
        console.error('HeadOffice RM Stock error:', error);
        res.status(500).send('Server error');
    }
};

const getFinishedGoodsStock = async (req, res) => {
    try {
        const finishedGoods = await Product.find({ productType: 'Finished Good' }).sort({ productName: 1 });
        res.render('headoffice/finished-goods-stock', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            finishedGoods,
            title: 'Finished Goods Stock'
        });
    } catch (error) {
        console.error('HeadOffice FG Stock error:', error);
        res.status(500).send('Server error');
    }
};

const getYesterdayReport = async (req, res) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endYesterday = new Date(yesterday);
        endYesterday.setHours(23, 59, 59, 999);

        // Date for display (yesterday)
        const dateStr = yesterday.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // 1. Salesperson Wise Orders
        const orders = await Order.find({
            createdAt: { $gte: yesterday, $lte: endYesterday },
            orderStatus: 'Ordered'
        }).populate('salespersonId', 'fullName');

        const salespersonActivity = {};
        orders.forEach(order => {
            const name = order.salespersonId ? order.salespersonId.fullName : 'Direct/Other';
            if (!salespersonActivity[name]) {
                salespersonActivity[name] = { count: 0, totalAmount: 0 };
            }
            salespersonActivity[name].count++;
            const orderTotal = (order.products || []).reduce((sum, p) => sum + (p.quantity * (p.rate || 0)), 0);
            salespersonActivity[name].totalAmount += orderTotal;
        });

        // 2. Dispatches (DC)
        const dispatches = await Dispatch.find({
            dispatchDate: { $gte: yesterday, $lte: endYesterday }
        }).populate('productId');

        // 3. Production
        const productionRecords = await Production.find({
            createdAt: { $gte: yesterday, $lte: endYesterday }
        }).populate({
            path: 'productId',
            populate: { path: 'components.productId' }
        });

        // 4. Raw Material Used (Derived from production)
        const rmUsed = {};
        productionRecords.forEach(record => {
            if (record.productId && record.productId.components) {
                record.productId.components.forEach(comp => {
                    const name = comp.productName || (comp.productId ? comp.productId.productName : 'Unknown');
                    const uom = comp.uom || (comp.productId ? comp.productId.uom : '');
                    const key = `${name}|${uom}`;
                    
                    if (!rmUsed[key]) {
                        rmUsed[key] = { name, uom, quantity: 0 };
                    }
                    // Quantity in components is usually per 1 unit of product
                    rmUsed[key].quantity += (comp.quantity * record.quantity);
                });
            }
        });

        // 5. Inwards
        const inwards = await Inward.find({
            createdAt: { $gte: yesterday, $lte: endYesterday }
        }).populate('productId');

        // Organize by Factory
        const factoryWiseData = {
            indapur: { production: [], dispatches: [], inwards: [] },
            shirapur: { production: [], dispatches: [] , inwards: [] }
        };

        const addToFactory = (item, type) => {
            if (!item) return;
            const factory = String(item.factory || 'indapur').toLowerCase().trim();
            if (factoryWiseData[factory]) {
                factoryWiseData[factory][type].push(item);
            } else {
                // Default to indapur if factory is unrecognized to avoid missing data
                factoryWiseData.indapur[type].push(item);
            }
        };

        if (Array.isArray(productionRecords)) productionRecords.forEach(r => addToFactory(r, 'production'));
        if (Array.isArray(dispatches)) dispatches.forEach(d => addToFactory(d, 'dispatches'));
        if (Array.isArray(inwards)) inwards.forEach(i => addToFactory(i, 'inwards'));

        res.render('headoffice/at-a-glance', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            dateStr,
            salespersonActivity: salespersonActivity || {},
            factoryWiseData
        });

    } catch (error) {
        console.error('Yesterday Report error:', error);
        res.status(500).send('Server error');
    }
};

const getProductionHistory = async (req, res) => {
    try {
        const productionRecords = await Production.find()
            .populate('productId')
            .sort({ createdAt: -1 })
            .limit(100);
        res.render('headoffice/production-history', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            productionRecords,
            title: 'Production History'
        });
    } catch (error) {
        console.error('HeadOffice Production History error:', error);
        res.status(500).send('Server error');
    }
};

const calculateMRP = async (req, res) => {
    try {
        const { items, factory } = req.body; // items: [{ productId, quantity }]
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        const requirements = {}; // Map of RM ID -> { name, needed, uom }
        const fgStockInfo = [];

        for (const item of items) {
            const product = await Product.findById(item.productId).populate('components.productId');
            if (!product || !product.components) continue;

            const targetQty = parseFloat(item.quantity) || 0;
            const unitsPerBox = parseFloat(product.packaging) || 1;
            const totalUnits = targetQty * unitsPerBox;

            // Track FG Stock Info
            fgStockInfo.push({
                name: product.productName,
                packaging: product.packaging || 'N/A',
                targetQty: targetQty,
                availableQty: (product.factoryStock && product.factoryStock[factory]) ? product.factoryStock[factory].toFixed(0) : 0
            });

            product.components.forEach(comp => {
                const rmId = comp.productId._id.toString();
                if (!requirements[rmId]) {
                    requirements[rmId] = {
                        name: comp.productName || comp.productId.productName,
                        needed: 0,
                        uom: comp.uom || comp.productId.uom
                    };
                }
                requirements[rmId].needed += (comp.quantity * totalUnits);
            });
        }

        // Now fetch current stock and calculate balances
        const results = [];
        for (const rmId in requirements) {
            const rm = await Product.findById(rmId);
            const reqData = requirements[rmId];
            const stock = (rm.factoryStock && rm.factoryStock[factory]) ? rm.factoryStock[factory] : 0;
            const balance = stock - reqData.needed;
            
            results.push({
                name: reqData.name,
                requiredQty: reqData.needed.toFixed(2),
                uom: reqData.uom,
                availableQty: stock.toFixed(2),
                balance: balance.toFixed(2),
                status: balance >= 0 ? 'Excess' : 'Shortage'
            });
        }

        res.json({
            rawMaterials: results,
            finishedGoods: fgStockInfo
        });

    } catch (error) {
        console.error('MRP Calculation error:', error);
        res.status(500).json({ error: 'Calculation failed' });
    }
};

const assignProductionPlan = async (req, res) => {
    try {
        const { factory, items } = req.body;

        if (!factory || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Factory and valid items must be provided' });
        }

        // Validate items
        for (const item of items) {
            if (!item.productId || !item.targetBoxes || item.targetBoxes <= 0) {
                return res.status(400).json({ error: 'Invalid product details provided' });
            }
        }

        const productionPlan = new ProductionPlan({
            factory,
            assignedBy: req.session.userId,
            targetFinishedGoods: items.map(item => ({
                product: item.productId,
                targetBoxes: item.targetBoxes,
                producedBoxes: 0
            }))
        });

        await productionPlan.save();
        
        res.status(201).json({ 
            message: 'Production plan assigned successfully',
            planId: productionPlan._id 
        });

    } catch (error) {
        console.error('Assign Production Plan error:', error);
        res.status(500).json({ error: 'Failed to assign production plan' });
    }
};

module.exports = {
    getDashboard,
    getIMS,
    getYesterdayReport,
    downloadDailyReport,
    getTeleCRM,
    exportTeleCRM,
    createSupplier,
    createCustomer,
    getCampaigns,
    getRawMaterialStock,
    getFinishedGoodsStock,
    getProductionHistory,
    calculateMRP,
    assignProductionPlan
};
