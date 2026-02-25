const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Inward = require('../models/Inward');
const Dispatch = require('../models/Dispatch');
const Customer = require('../models/Customer');
const ociService = require('../services/ociService');
const path = require('path');

// GET /factory-incharge/dashboard
const getDashboard = async (req, res) => {
    try {
        // Fetch raw materials for stock view
        const rawMaterials = await Product.find({ productType: 'Raw Material' }).sort({ productName: 1 });

        // Fetch all active suppliers for inward form autocomplete
        const suppliers = await Supplier.find({ status: 'Active' }).sort({ supplierName: 1 });

        // Calculate Stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [inwardToday, dispatchToday] = await Promise.all([
            Inward.find({ createdAt: { $gte: today } }),
            Dispatch.find({ createdAt: { $gte: today } })
        ]);

        const stats = {
            totalInwardToday: inwardToday.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
            totalDispatchToday: dispatchToday.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
            lowStockCount: rawMaterials.filter(m => (m.availableQty || 0) < (m.bufferQty || 0)).length
        };

        res.render('factoryIncharge/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            rawMaterials,
            suppliers,
            stats,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Factory Incharge Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /factory-incharge/inward
const getInwardList = async (req, res) => {
    try {
        const inwardTransactions = await Inward.find()
            .sort({ createdAt: -1 })
            .populate('supplierId', 'supplierName')
            .populate('productId', 'productName packaging uom');

        res.render('factoryIncharge/inward', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            inwardTransactions,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get Inward List error:', error);
        res.status(500).send('Server error');
    }
};

// GET /factory-incharge/inward/new
const getInwardForm = async (req, res) => {
    try {
        res.render('factoryIncharge/inward-new', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get Inward Form error:', error);
        res.status(500).send('Server error');
    }
};

// POST /factory-incharge/inward
const createInward = async (req, res) => {
    try {
        const { supplierId, items, conditionConfirmed, invoiceNo, invoiceDate } = req.body;

        if (!conditionConfirmed) {
            return res.redirect('/factory-incharge/inward/new?error=Please confirm the material condition');
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.redirect('/factory-incharge/inward/new?error=Invalid supplier');
        }

        // Parse items from JSON string
        let inwardItems = [];
        try {
            inwardItems = JSON.parse(items);
        } catch (e) {
            // Fallback for single item if items is not valid JSON
            const { productId, quantity, price, gstPercentage } = req.body;
            if (productId && quantity) {
                inwardItems = [{ productId, quantity, price, gstPercentage }];
            }
        }

        if (!inwardItems || inwardItems.length === 0) {
            return res.redirect('/factory-incharge/inward/new?error=No items added');
        }

        // --- Phase 1: Handle Invoice Photo Upload (Optional) ---
        let invoicePhotoUrl = null;
        if (req.file) {
            try {
                const file = req.file;
                const fileName = `invoices/INW_${invoiceNo || Date.now()}_${Date.now()}${path.extname(file.originalname)}`;
                console.log(`[Inward Upload] Uploading invoice photo: ${fileName}`);

                invoicePhotoUrl = await ociService.uploadToOCI(file.buffer, fileName, file.mimetype);
                console.log(`[Inward Upload] Success. URL: ${invoicePhotoUrl}`);
            } catch (ociError) {
                console.error('[Inward Upload] OCI Error:', ociError);
            }
        }

        // --- Phase 2: Process each item ---
        for (const item of inwardItems) {
            const product = await Product.findById(item.productId);
            if (!product) continue;

            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const gstPercentage = parseFloat(item.gstPercentage) || 0;

            if (quantity <= 0) continue;

            // Create inward record
            const inward = new Inward({
                supplierId,
                supplierName: supplier.supplierName,
                productId: item.productId,
                productName: product.productName,
                quantity: quantity,
                price: price,
                gstPercentage: gstPercentage,
                conditionConfirmed: true,
                invoiceNo: invoiceNo || null,
                invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                invoicePhoto: invoicePhotoUrl,
                recordedBy: req.session.userId
            });

            await inward.save();

            // Update product stock
            product.availableQty = (product.availableQty || 0) + quantity;
            await product.save();
        }

        res.redirect('/factory-incharge/inward?success=Inward transactions recorded successfully' + (invoicePhotoUrl ? ' with invoice photo' : ''));
    } catch (error) {
        console.error('Create Inward error:', error);
        res.redirect('/factory-incharge/dashboard?error=Failed to record inward');
    }
};

// GET /api/suppliers/search
const searchSuppliers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const suppliers = await Supplier.find({
            supplierName: { $regex: query, $options: 'i' },
            status: 'Active'
        }).limit(10);
        res.json(suppliers);
    } catch (error) {
        console.error('Search suppliers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/raw-materials/search
const searchRawMaterials = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const materials = await Product.find({
            productName: { $regex: query, $options: 'i' },
            productType: 'Raw Material'
        }).limit(10);
        res.json(materials);
    } catch (error) {
        console.error('Search raw materials error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Dispatch Flow
const getDispatchList = async (req, res) => {
    try {
        const dispatchTransactions = await Dispatch.find()
            .sort({ createdAt: -1 })
            .populate('productId', 'productName packaging uom');

        res.render('factoryIncharge/dispatch', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            dispatchTransactions,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get Dispatch List error:', error);
        res.status(500).send('Server error');
    }
};

const getDispatchForm = async (req, res) => {
    try {
        res.render('factoryIncharge/dispatch-new', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get Dispatch Form error:', error);
        res.status(500).send('Server error');
    }
};

// POST /factory-incharge/dispatch
const createDispatch = async (req, res) => {
    try {
        const { receiverName, items, invoiceNo, invoiceDate, vehicleNo, driverName, driverMobileNo, remark } = req.body;

        // Handle Invoice Photo Upload
        let invoicePhotoUrl = null;
        if (req.file) {
            try {
                const fileName = `dispatch_${Date.now()}_${req.file.originalname}`;
                invoicePhotoUrl = await ociService.uploadToOCI(req.file.buffer, fileName, req.file.mimetype);
                console.log('Dispatch Invoice Photo uploaded:', invoicePhotoUrl);
            } catch (ociError) {
                console.error('OCI Dispatch Photo Upload Error:', ociError);
                // Continue without photo instead of failing? User choice, but for now we continue
            }
        }

        // Parse items from JSON string
        console.log('Dispatch Body:', req.body);
        let dispatchItems = [];
        try {
            dispatchItems = JSON.parse(items);
            console.log('Parsed Dispatch Items:', dispatchItems);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            // Fallback for single item if items is not valid JSON
            const { productId, quantity } = req.body;
            if (productId && quantity) {
                dispatchItems = [{ productId, quantity }];
            }
        }

        if (!dispatchItems || dispatchItems.length === 0) {
            return res.redirect('/factory-incharge/dispatch/new?error=No products added');
        }

        // --- Phase 1: Validate Raw Material Stock ---
        const rmRequirements = new Map(); // Map<string, number> where string is RM ID
        const productsMap = new Map(); // Cache products to avoid re-fetching

        for (const item of dispatchItems) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            productsMap.set(item.productId, product);

            const qty = parseFloat(item.quantity) || 0;
            if (qty <= 0) continue;

            // Calculate RM requirements based on BoM
            if (product.components && product.components.length > 0) {
                for (const comp of product.components) {
                    // Check if component has valid ID and quantity
                    if (comp.productId && comp.quantity) {
                        const currentReq = rmRequirements.get(comp.productId.toString()) || 0;
                        const reqQty = qty * parseFloat(comp.quantity);
                        rmRequirements.set(comp.productId.toString(), currentReq + reqQty);
                    }
                }
            }
        }

        // Check stock availability for all required RMs
        const missingRMs = [];
        for (const [rmId, requiredQty] of rmRequirements.entries()) {
            const rm = await Product.findById(rmId);
            if (!rm) {
                console.warn(`Raw Material ID ${rmId} not found in database.`);
                continue;
            }

            if (rm.availableQty < requiredQty) {
                missingRMs.push(`${rm.productName} (Required: ${requiredQty.toFixed(2)} ${rm.uom}, Available: ${rm.availableQty.toFixed(2)} ${rm.uom})`);
            }
        }

        if (missingRMs.length > 0) {
            const errorMsg = `Insufficient Raw Material Stock: ${missingRMs.join(', ')}`;
            return res.redirect(`/factory-incharge/dispatch/new?error=${encodeURIComponent(errorMsg)}`);
        }

        // --- Phase 2: Deduct Stock & Create Records ---

        // 1. Deduct Raw Material Stock
        for (const [rmId, requiredQty] of rmRequirements.entries()) {
            await Product.findByIdAndUpdate(rmId, { $inc: { availableQty: -requiredQty } });
        }

        // 2. Create Dispatch Records (Finished Goods)
        for (const item of dispatchItems) {
            const product = productsMap.get(item.productId);
            if (!product) continue;

            const qty = parseFloat(item.quantity) || 0;
            if (qty <= 0) continue;

            // Note: We explicitly DO NOT deduct Finished Good stock here, as per user request.

            const dispatch = new Dispatch({
                productId: item.productId,
                productName: product.productName,
                quantity: qty,
                receiverName,
                remark,
                invoiceNo,
                invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                vehicleNo,
                driverName,
                driverMobileNo,
                invoicePhoto: invoicePhotoUrl,
                recordedBy: req.session.userId
            });

            await dispatch.save();
        }

        res.redirect('/factory-incharge/dispatch?success=Dispatch transactions recorded and Raw Material stock updated successfully' + (invoicePhotoUrl ? ' with invoice photo' : ''));
    } catch (error) {
        console.error('Create Dispatch error:', error);
        res.redirect('/factory-incharge/dispatch/new?error=Server error during dispatch');
    }
};

const searchFinishedGoods = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const products = await Product.find({
            productName: { $regex: query, $options: 'i' },
            productType: 'Finished Good'
        }).limit(10);
        res.json(products);
    } catch (error) {
        console.error('Search finished goods error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const searchCustomers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const customers = await Customer.find({
            customerName: { $regex: query, $options: 'i' },
            status: 'Active'
        }).limit(10);
        res.json(customers);
    } catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    getInwardList,
    getInwardForm,
    createInward,
    getDispatchList,
    getDispatchForm,
    createDispatch,
    searchSuppliers,
    searchRawMaterials,
    searchFinishedGoods,
    searchCustomers
};
