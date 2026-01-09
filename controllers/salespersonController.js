const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { validateGPS } = require('../utils/validators');

// GET /salesperson/dashboard
const getDashboard = async (req, res) => {
    try {
        const myOrders = await Order.find({ salespersonId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.render('salesperson/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            orders: myOrders
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /salesperson/create-order
const getCreateOrder = async (req, res) => {
    try {
        let prefillData = null;
        if (req.query.prefillId) {
            const order = await Order.findById(req.query.prefillId);
            if (order && order.salespersonId.toString() === req.session.userId.toString()) {
                prefillData = {
                    customerId: order.customerId,
                    customerName: order.customerName,
                    address: order.address,
                    mobileNo: order.mobileNo,
                    gstNo: order.gstNo,
                    category: order.category
                };
            }
        }

        res.render('salesperson/create-order', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            success: req.query.success,
            error: req.query.error,
            prefill: prefillData
        });
    } catch (error) {
        console.error('Create order view error:', error);
        res.status(500).send('Server error');
    }
};

// GET /api/customers/search
const searchCustomers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }

        const customers = await Customer.find({
            customerName: { $regex: query, $options: 'i' }
        }).limit(10);

        res.json(customers);
    } catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/customers/:id
const getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/products/search
const searchProducts = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }

        const products = await Product.find({
            productName: { $regex: query, $options: 'i' }
        }).limit(10);

        res.json(products);
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /salesperson/orders/create
const createOrder = async (req, res) => {
    try {
        const {
            customerId,
            customerName,
            address,
            mobileNo,
            gstNo,
            category,
            orderStatus,
            products,
            remark,
            tentativeRepeatDate,
            latitude,
            longitude,
            accuracy
        } = req.body;

        // Validate GPS
        const gpsValidation = validateGPS(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(accuracy)
        );

        if (!gpsValidation.valid) {
            return res.redirect(`/salesperson/create-order?error=${encodeURIComponent(gpsValidation.error)}`);
        }

        // Parse products (comes as JSON string)
        let productList = [];
        if (orderStatus === 'Ordered' && products) {
            productList = JSON.parse(products);
        }

        // Create or update customer
        let customer;
        if (customerId) {
            customer = await Customer.findById(customerId);
        } else {
            // Check if customer exists by name
            customer = await Customer.findOne({ customerName });
            if (!customer) {
                customer = new Customer({
                    customerName,
                    address,
                    mobileNo,
                    gstNo,
                    category
                });
                await customer.save();
            }
        }

        // Create order
        const newOrder = new Order({
            customerId: customer._id,
            customerName,
            address,
            mobileNo,
            gstNo,
            category,
            orderStatus,
            products: productList,
            remark,
            tentativeRepeatDate,
            salespersonId: req.session.userId,
            gpsLocation: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                accuracy: parseFloat(accuracy)
            },
            approvalStatus: 'pending'
        });

        await newOrder.save();
        res.redirect('/salesperson/create-order?success=Order created successfully');

    } catch (error) {
        console.error('Create order error:', error);
        res.redirect('/salesperson/create-order?error=Failed to create order');
    }
};

// GET /salesperson/orders
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ salespersonId: req.session.userId })
            .sort({ createdAt: -1 })
            .populate('customerId');

        res.render('salesperson/orders', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).send('Server error');
    }
};

// GET /salesperson/reminders
const getReminders = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const reminders = await Order.find({
            salespersonId: req.session.userId,
            tentativeRepeatDate: {
                $gte: today,
                $lt: tomorrow
            }
        }).sort({ createdAt: -1 });

        res.render('salesperson/reminders', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            reminders
        });
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).send('Server error');
    }
};

// POST /salesperson/reminders/reschedule
const rescheduleReminder = async (req, res) => {
    try {
        const { orderId, newDate } = req.body;
        await Order.findOneAndUpdate(
            { _id: orderId, salespersonId: req.session.userId },
            { tentativeRepeatDate: new Date(newDate) }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Reschedule reminder error:', error);
        res.status(500).json({ success: false, error: 'Failed to reschedule' });
    }
};

module.exports = {
    getDashboard,
    getCreateOrder,
    searchCustomers,
    getCustomer,
    searchProducts,
    createOrder,
    getOrders,
    getReminders,
    rescheduleReminder
};
