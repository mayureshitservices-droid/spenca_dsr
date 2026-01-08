const Order = require('../models/Order');
const User = require('../models/User');

// GET /sales-head/dashboard
const getDashboard = async (req, res) => {
    try {
        const pendingOrders = await Order.find({ approvalStatus: 'pending' })
            .populate('salespersonId', 'fullName')
            .sort({ createdAt: -1 })
            .limit(20);

        const totalPending = await Order.countDocuments({ approvalStatus: 'pending' });
        const totalApproved = await Order.countDocuments({ approvalStatus: 'approved' });
        const totalRejected = await Order.countDocuments({ approvalStatus: 'rejected' });

        res.render('salesHead/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            orders: pendingOrders,
            stats: {
                totalPending,
                totalApproved,
                totalRejected
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /sales-head/pending-orders
const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ approvalStatus: 'pending' })
            .populate('salespersonId', 'fullName')
            .sort({ createdAt: -1 });

        res.render('salesHead/pending-orders', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            orders
        });
    } catch (error) {
        console.error('Get pending orders error:', error);
        res.status(500).send('Server error');
    }
};

// GET /sales-head/all-orders
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('salespersonId', 'fullName')
            .sort({ createdAt: -1 });

        res.render('salesHead/all-orders', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            orders
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).send('Server error');
    }
};

// POST /sales-head/orders/:id/approve
const approveOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.approvalStatus = 'approved';
        order.approvedBy = req.session.userId;
        order.approvedAt = new Date();

        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Approve order error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /sales-head/orders/:id/reject
const rejectOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.approvalStatus = 'rejected';
        order.approvedBy = req.session.userId;
        order.approvedAt = new Date();

        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    getPendingOrders,
    getAllOrders,
    approveOrder,
    rejectOrder
};
