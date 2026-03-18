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

// Services
const inventoryService = require('../services/inventoryService');
const reportService = require('../services/reportService');
const telecrmService = require('../services/telecrmService');

// GET /headoffice/dashboard
const getDashboard = async (req, res) => {
    try {
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
        const devices = await telecrmService.fetchDevicesWithStats();

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

        // Use Inventory Service for stock and history fetching
        const rawMaterials = await inventoryService.getStock('Raw Material');
        const finishedGoods = await inventoryService.getStock('Finished Good');
        
        const coreProducts = await Product.find({ isTemplate: true, productType: 'Finished Good' }).sort({ productName: 1 });
        const customers = await Customer.find().sort({ customerName: 1 });
        const suppliers = await Supplier.find().sort({ supplierName: 1 });

        const inwardTransactions = await inventoryService.getTransactions('Inward', query);
        const dispatchTransactions = await inventoryService.getTransactions('Dispatch', query);
        const productionRecords = await inventoryService.getTransactions('Production', query);

        res.render('headoffice/ims', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            rawMaterials,
            finishedGoods,
            coreProducts,
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
        const { customerName, address, mobileNo, category, gstNo, paymentTerms, status, customerType, coreProductIds, capColor } = req.body;

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
            customerType,
            capColor
        });

        await customer.save();

        // Automated Branded Product Creation
        if (customerType === 'Branded' && coreProductIds) {
            const selectedIds = Array.isArray(coreProductIds) ? coreProductIds : [coreProductIds];
            
            for (const templateId of selectedIds) {
                const template = await Product.findById(templateId).populate('components.productId');
                if (!template) continue;

                // 1. Create Branded RMs if needed
                const brandedComponents = [];
                for (const comp of template.components) {
                    if (comp.productId && comp.productId.isTemplate) {
                        // Create a branded version of this RM (e.g., Label or Cap) linked to this FG
                        // Format labels: [Customer] - [Prod Short] Label
                        // Format caps: [Customer] - [Prod Short] [Color] Cap
                        let rmSuffix = comp.productName;
                        if (rmSuffix === 'Cap' && capColor) {
                            rmSuffix = `${capColor} Cap`;
                        }
                        
                        const brandedRMName = `${customerName} - ${template.productName} ${rmSuffix}`;
                        let brandedRM = await Product.findOne({ productName: brandedRMName, brandedCustomerId: customer._id });
                        
                        if (!brandedRM) {
                            brandedRM = new Product({
                                productName: brandedRMName,
                                productType: 'Raw Material',
                                uom: comp.uom || comp.productId.uom,
                                specification: comp.productId.specification,
                                packaging: comp.productId.packaging,
                                isBranded: true,
                                brandedCustomerId: customer._id,
                                availableQty: 0,
                                factoryStock: { indapur: 0, shirapur: 0 }
                            });
                            await brandedRM.save();
                        }
                        
                        brandedComponents.push({
                            productId: brandedRM._id,
                            productName: brandedRM.productName,
                            quantity: comp.quantity,
                            uom: brandedRM.uom
                        });
                    } else {
                        // Regular RM (Preform, Cap, Shrink), keep as is
                        brandedComponents.push({
                            productId: comp.productId._id,
                            productName: comp.productName,
                            quantity: comp.quantity,
                            uom: comp.uom
                        });
                    }
                }

                // 2. Create Branded FG
                // Format: [Customer] - [Prod Short]
                const brandedFGName = `${customerName} - ${template.productName}`;
                let brandedFG = await Product.findOne({ productName: brandedFGName, brandedCustomerId: customer._id });
                
                if (!brandedFG) {
                    brandedFG = new Product({
                        productName: brandedFGName,
                        productType: 'Finished Good',
                        uom: template.uom,
                        specification: template.specification,
                        packaging: template.packaging,
                        isBranded: true,
                        brandedCustomerId: customer._id,
                        availableQty: 0,
                        factoryStock: { indapur: 0, shirapur: 0 },
                        components: brandedComponents
                    });
                    await brandedFG.save();
                }
            }
        }

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
        const { date } = req.query;
        const reportData = await reportService.getAtAGlanceReportData(date);

        res.render('headoffice/at-a-glance', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            ...reportData
        });

    } catch (error) {
        console.error('At-a-glance Report error:', error);
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

        const results = await inventoryService.calculateMRP(items, factory);
        res.json(results);

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

const renderChallan = async (req, res) => {
    try {
        const { dispatchId } = req.params;
        const Dispatch = require('../models/Dispatch');
        const Product = require('../models/Product');
        const Customer = require('../models/Customer');

        const dispatch = await Dispatch.findById(dispatchId).populate('productId');
        if (!dispatch) {
            return res.status(404).send('Dispatch not found');
        }

        // Try to find customer details for address/GSTIN
        const customer = await Customer.findOne({ customerName: { $regex: new RegExp(`^${dispatch.receiverName}$`, 'i') } });
        
        const dispatchData = {
            ...dispatch.toObject(),
            receiverAddress: customer ? customer.address : '---',
            receiverGSTIN: customer ? customer.gstNo : '---'
        };

        res.render('factoryIncharge/delivery-challan', {
            dispatch: dispatchData,
            user: { name: req.session.userName },
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Render Challan error:', error);
        res.status(500).send('Server error');
    }
};

const renderCustomerChallan = async (req, res) => {
    try {
        const { receiverName, date, factory } = req.query;
        const Dispatch = require('../models/Dispatch');
        const Customer = require('../models/Customer');

        if (!receiverName || !date) {
            return res.status(400).send('Receiver Name and Date are required');
        }

        // Parse local date boundaries matching reportService.js logic
        const [yyyy, mm, dd] = date.split('-').map(Number);
        const targetDate = new Date(yyyy, mm - 1, dd);
        targetDate.setHours(0, 0, 0, 0);
        
        const endTarget = new Date(targetDate);
        endTarget.setHours(23, 59, 59, 999);

        // Fetch all dispatches for this receiver on this date and factory
        const query = {
            receiverName,
            dispatchDate: { $gte: targetDate, $lte: endTarget }
        };
        // Just in case factory isn't passed for some reason, we default to the query
        if (factory) {
            query.factory = factory;
        }

        const dispatches = await Dispatch.find(query).populate('productId');

        if (!dispatches || dispatches.length === 0) {
            return res.status(404).send('No dispatches found for this customer on the selected date');
        }

        // Fetch customer details
        const customer = await Customer.findOne({ customerName: { $regex: new RegExp(`^${receiverName}$`, 'i') } });

        // Aggregate data for the template
        // We'll take top-level header fields from the first dispatch (DC No, Date, Vehicle, Driver)
        const firstDispatch = dispatches[0];

        const aggregatedProducts = dispatches.map(d => ({
            productName: d.productName,
            batchNo: d.batchNo || '---',
            quantity: d.quantity,
            dcNo: d.dcNo // Keep DC No at item level too if they differ
        }));

        const totalQuantity = dispatches.reduce((sum, d) => sum + d.quantity, 0);

        const dispatchData = {
            receiverName: receiverName,
            receiverAddress: customer ? customer.address : '---',
            receiverGSTIN: customer ? customer.gstNo : '---',
            dcNo: firstDispatch.dcNo, // Using first DC No for header
            dispatchDate: firstDispatch.dispatchDate,
            driverName: firstDispatch.driverName,
            driverMobileNo: firstDispatch.driverMobileNo,
            vehicleNo: firstDispatch.vehicleNo,
            products: aggregatedProducts,
            totalQuantity: totalQuantity
        };

        res.render('factoryIncharge/delivery-challan', {
            dispatch: dispatchData,
            user: { name: req.session.userName },
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Render Customer Challan error:', error);
        res.status(500).send('Server error');
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
    assignProductionPlan,
    renderChallan,
    renderCustomerChallan
};
