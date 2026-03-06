const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Inward = require('../models/Inward');
const Dispatch = require('../models/Dispatch');
const Customer = require('../models/Customer');
const Production = require('../models/Production');
const ociService = require('../services/ociService');
const path = require('path');

// GET /factory-incharge/dashboard
const getDashboard = async (req, res) => {
    try {
        res.render('factoryIncharge/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            title: 'Factory Dashboard',
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
                inwardUnit: item.inwardUnit || 'nos',
                inwardQty: parseFloat(item.inwardQty) || quantity,
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

        // Cache products to avoid re-fetching in the save loop
        const productsMap = new Map();
        for (const item of dispatchItems) {
            if (!item.productId) continue;
            const product = await Product.findById(item.productId);
            if (product) {
                productsMap.set(item.productId.toString(), product);
            }
        }

        // --- Phase 2: Deduct Stock & Create Records ---

        // 1. Deduct Finished Good Stock (in Boxes)
        for (const item of dispatchItems) {
            const qty = parseFloat(item.quantity) || 0;
            if (qty > 0) {
                const result = await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { availableQty: -qty } },
                    { new: true }
                );
                console.log(`[Dispatch Stock] Deducted ${qty} boxes from product ${item.productId}. New availableQty: ${result ? result.availableQty : 'PRODUCT NOT FOUND'}`);
            }
        }

        // 2. Create Dispatch Records
        for (const item of dispatchItems) {
            const product = productsMap.get(item.productId.toString());
            if (!product) continue;

            const qty = parseFloat(item.quantity) || 0;
            if (qty <= 0) continue;

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

        res.redirect('/factory-incharge/dispatch?success=Dispatch transactions recorded and Finished Good stock updated successfully' + (invoicePhotoUrl ? ' with invoice photo' : ''));
    } catch (error) {
        console.error('Create Dispatch error:', error);
        res.redirect('/factory-incharge/dispatch/new?error=Server error during dispatch');
    }
};

// GET /factory-incharge/production
const getProductionList = async (req, res) => {
    try {
        const productionRecords = await Production.find()
            .populate('productId')
            .sort({ createdAt: -1 })
            .limit(50);
        res.render('factoryIncharge/production', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            productionRecords,
            title: 'Production History'
        });
    } catch (error) {
        console.error('Get Production List error:', error);
        res.redirect('/factory-incharge/dashboard?error=Failed to load production records');
    }
};

// GET /factory-incharge/production/new
const getProductionForm = async (req, res) => {
    try {
        const finishedGoods = await Product.find({ productType: 'Finished Good' }).sort({ productName: 1 });
        res.render('factoryIncharge/production-new', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            finishedGoods,
            title: 'Record Production'
        });
    } catch (error) {
        console.error('Get Production Form error:', error);
        res.redirect('/factory-incharge/production?error=Failed to load form');
    }
};

// POST /factory-incharge/production
const createProduction = async (req, res) => {
    try {
        const { shift, items } = req.body;

        if (!shift) {
            return res.redirect('/factory-incharge/production/new?error=Please select a shift');
        }

        // Parse items - array of { productId, quantity, batchNo, remarks }
        let productionItems = [];
        try {
            productionItems = JSON.parse(items);
        } catch (e) {
            return res.redirect('/factory-incharge/production/new?error=Invalid form data');
        }

        // Filter only items with qty > 0
        productionItems = productionItems.filter(item => parseFloat(item.quantity) > 0);

        if (productionItems.length === 0) {
            return res.redirect('/factory-incharge/production/new?error=Please enter quantity for at least one product');
        }

        // Validate batchNo for all included items
        const missingBatch = productionItems.filter(item => !item.batchNo || !item.batchNo.trim());
        if (missingBatch.length > 0) {
            return res.redirect('/factory-incharge/production/new?error=Please enter a Batch No for each product you are recording');
        }

        // Process each product
        const errors = [];
        let recorded = 0;

        for (const item of productionItems) {
            const qty = parseFloat(item.quantity);
            const batchNo = item.batchNo.trim();

            // 1. Fetch Finished Good
            const finishedGood = await Product.findById(item.productId);
            if (!finishedGood || finishedGood.productType !== 'Finished Good') {
                errors.push(`Invalid product: ${item.productId}`);
                continue;
            }

            // 2. Calculate RM requirements (qty is in Boxes)
            const unitsPerBox = parseFloat(finishedGood.packaging) || 1;
            const totalUnits = qty * unitsPerBox;
            console.log(`[Production] Processing ${qty} boxes of ${finishedGood.productName}. Multiplier: ${unitsPerBox}, Total Units: ${totalUnits}`);

            const rmRequirements = new Map();
            if (finishedGood.components && finishedGood.components.length > 0) {
                finishedGood.components.forEach(comp => {
                    const prev = rmRequirements.get(comp.productId.toString()) || 0;
                    rmRequirements.set(comp.productId.toString(), prev + comp.quantity * totalUnits);
                });
            }

            // 3. Validate RM Stock
            const missingRMs = [];
            for (const [rmId, requiredQty] of rmRequirements.entries()) {
                const rm = await Product.findById(rmId);
                if (!rm) continue;
                if (rm.availableQty < requiredQty) {
                    missingRMs.push(`${rm.productName} (Need: ${requiredQty.toFixed(2)}, Have: ${rm.availableQty.toFixed(2)})`);
                }
            }

            if (missingRMs.length > 0) {
                errors.push(`${finishedGood.productName}: Low RM - ${missingRMs.join(', ')}`);
                continue;
            }

            // 4. Deduct Raw Materials
            for (const [rmId, requiredQty] of rmRequirements.entries()) {
                await Product.findByIdAndUpdate(rmId, { $inc: { availableQty: -requiredQty } });
            }

            // 5. Increment Finished Good Stock (in Boxes)
            await Product.findByIdAndUpdate(item.productId, { $inc: { availableQty: qty } });

            // 6. Create Production Record
            const production = new Production({
                productId: item.productId,
                productName: finishedGood.productName,
                quantity: qty, // Quantity stored in Boxes
                batchNo,
                shift,
                remarks: item.remarks || '',
                recordedBy: req.session.userId
            });
            await production.save();
            recorded++;
        }

        if (errors.length > 0 && recorded === 0) {
            return res.redirect(`/factory-incharge/production/new?error=${encodeURIComponent(errors.join(' | '))}`);
        }

        const successMsg = `${recorded} product(s) recorded successfully` + (errors.length > 0 ? ` (${errors.length} skipped: ${errors.join(', ')})` : '');
        res.redirect(`/factory-incharge/production?success=${encodeURIComponent(successMsg)}`);
    } catch (error) {
        console.error('Create Production error:', error);
        res.redirect('/factory-incharge/production/new?error=Server error during production recording');
    }
};

const searchFinishedGoods = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        const products = await Product.find({
            productName: { $regex: query, $options: 'i' },
            productType: 'Finished Good'
        }).populate('brandedCustomerId', 'customerName').limit(20);
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

const getRawMaterialStock = async (req, res) => {
    try {
        const rawMaterials = await Product.find({ productType: 'Raw Material' }).sort({ productName: 1 });
        res.render('factoryIncharge/raw-material-stock', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            rawMaterials,
            title: 'Raw Material Stock'
        });
    } catch (error) {
        console.error('Get RM Stock error:', error);
        res.status(500).send('Server error');
    }
};

const getFinishedGoodsStock = async (req, res) => {
    try {
        const finishedGoods = await Product.find({ productType: 'Finished Good' }).sort({ productName: 1 });
        res.render('factoryIncharge/finished-goods-stock', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            finishedGoods,
            title: 'Finished Goods Stock'
        });
    } catch (error) {
        console.error('Get FG Stock error:', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    getDashboard,
    getRawMaterialStock,
    getFinishedGoodsStock,
    getInwardList,
    getInwardForm,
    createInward,
    getDispatchList,
    getDispatchForm,
    createDispatch,
    searchSuppliers,
    searchRawMaterials,
    searchFinishedGoods,
    searchCustomers,
    getProductionList,
    getProductionForm,
    createProduction
};
