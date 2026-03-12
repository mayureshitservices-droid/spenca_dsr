const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const multer = require('multer');
const path = require('path');

// Configure multer for product photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// GET /sysadmin/dashboard
const getDashboard = async (req, res) => {
    try {
        res.render('sysadmin/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /sysadmin/users
const getUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });

        res.render('sysadmin/users', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            users,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send('Server error');
    }
};

// POST /sysadmin/users/create
const createUser = async (req, res) => {
    try {
        const { fullName, region, contactNo, email, password, role, factory } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.redirect('/sysadmin/users?error=Email already exists');
        }

        const newUser = new User({
            fullName,
            region,
            contactNo,
            email,
            password,
            role,
            factory: role === 'factory_incharge' ? factory : null,
            activeStatus: true
        });

        await newUser.save();
        res.redirect('/sysadmin/users?success=User created successfully');

    } catch (error) {
        console.error('Create user error:', error);
        res.redirect('/sysadmin/users?error=Failed to create user');
    }
};

// PATCH /sysadmin/users/:id/toggle-status
const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.activeStatus = !user.activeStatus;
        await user.save();

        res.json({ success: true, activeStatus: user.activeStatus });
    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /sysadmin/products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).populate('brandedCustomerId');
        const brandedCustomers = await Customer.find({ customerType: 'Branded' }).sort({ customerName: 1 });

        // Segregate products for the view - default to Finished Good if not set
        const finishedGoods = products.filter(p => !p.productType || p.productType === 'Finished Good');
        const rawMaterials = products.filter(p => p.productType === 'Raw Material');

        console.log(`[Diagnostic] Found ${products.length} products and ${brandedCustomers.length} branded customers`);

        res.render('sysadmin/products', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            finishedGoods,
            rawMaterials,
            brandedCustomers,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).send('Server error');
    }
};

// POST /sysadmin/products/create
const createProduct = async (req, res) => {
    try {
        const { productName, productType, packaging, specification, uom, availableQty, remarks, isBranded, brandedCustomerId } = req.body;

        const newProduct = new Product({
            productName,
            productType: productType || 'Finished Good',
            packaging,
            specification,
            uom,
            availableQty: availableQty ? parseFloat(availableQty) : 0,
            photo: req.file ? '/uploads/' + req.file.filename : null,
            remarks,
            isBranded: isBranded === 'true',
            brandedCustomerId: (isBranded === 'true' && brandedCustomerId) ? brandedCustomerId : null
        });

        await newProduct.save();
        res.redirect('/sysadmin/products?success=Product created successfully');

    } catch (error) {
        console.error('Create product error:', error);
        res.redirect('/sysadmin/products?error=Failed to create product');
    }
};

// GET /sysadmin/products/:id
const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('components.productId');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /sysadmin/products/:id/bom
const updateBOM = async (req, res) => {
    try {
        const { components } = req.body;
        // components is expected to be an array of { productId, productName, quantity, uom }
        await Product.findByIdAndUpdate(req.params.id, { components });
        res.json({ success: true, message: 'BOM updated successfully' });
    } catch (error) {
        console.error('Update BOM error:', error);
        res.status(500).json({ error: 'Failed to update BOM' });
    }
};

// DELETE /sysadmin/products/:id
const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    getUsers,
    createUser,
    toggleUserStatus,
    getProducts,
    createProduct,
    getProduct,
    updateBOM,
    deleteProduct,
    upload
};
