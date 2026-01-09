const User = require('../models/User');
const Product = require('../models/Product');
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
        const { fullName, region, contactNo, email, password, role } = req.body;

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
        const products = await Product.find().sort({ createdAt: -1 });

        res.render('sysadmin/products', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            products,
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
        const { productName, packaging, gstPercent, remarks } = req.body;

        const newProduct = new Product({
            productName,
            packaging,
            gstPercent: gstPercent ? parseFloat(gstPercent) : undefined,
            photo: req.file ? '/uploads/' + req.file.filename : null,
            remarks
        });

        await newProduct.save();
        res.redirect('/sysadmin/products?success=Product created successfully');

    } catch (error) {
        console.error('Create product error:', error);
        res.redirect('/sysadmin/products?error=Failed to create product');
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
    deleteProduct,
    upload
};
