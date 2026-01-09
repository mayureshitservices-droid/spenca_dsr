const Order = require('../models/Order');

// GET /owner/dashboard
const getDashboard = async (req, res) => {
    try {
        const salespersonStats = await Order.aggregate([
            { $match: { approvalStatus: 'approved' } },
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
            { $unwind: '$salesperson' },
            {
                $project: {
                    name: '$salesperson.fullName',
                    contactNo: '$salesperson.contactNo',
                    region: '$salesperson.region',
                    totalVisits: 1,
                    totalOrders: 1
                }
            },
            { $sort: { totalVisits: -1 } }
        ]);

        const allOrders = await Order.find({ approvalStatus: 'approved' })
            .select('customerName createdAt orderStatus products tentativeRepeatDate remark salespersonId')
            .populate('salespersonId', 'fullName')
            .sort({ createdAt: -1 })
            .lean();

        // Filter out orders where salesperson population failed (e.g. deleted user)
        const validOrders = allOrders.filter(o => o.salespersonId);
        res.render('owner/dashboard', {
            user: { name: req.session.userName },
            userRole: req.session.userRole,
            salespersonStats,
            allOrders: validOrders
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
};

// GET /api/owner/stats/total-orders
const getTotalOrders = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments({ approvalStatus: 'approved' });
        const orderedCount = await Order.countDocuments({
            approvalStatus: 'approved',
            orderStatus: 'Ordered'
        });
        const notOrderedCount = await Order.countDocuments({
            approvalStatus: 'approved',
            orderStatus: 'Not Ordered'
        });

        res.json({
            total: totalOrders,
            ordered: orderedCount,
            notOrdered: notOrderedCount
        });
    } catch (error) {
        console.error('Get total orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/owner/stats/total-sales
const getTotalSales = async (req, res) => {
    try {
        const orders = await Order.find({
            approvalStatus: 'approved',
            orderStatus: 'Ordered'
        });

        // Calculate total products sold
        let totalProducts = 0;
        orders.forEach(order => {
            if (order.products && order.products.length > 0) {
                order.products.forEach(product => {
                    totalProducts += product.quantity;
                });
            }
        });

        res.json({
            totalOrders: orders.length,
            totalProducts
        });
    } catch (error) {
        console.error('Get total sales error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/owner/stats/salesperson-sales
const getSalespersonSales = async (req, res) => {
    try {
        const salesData = await Order.aggregate([
            { $match: { approvalStatus: 'approved', orderStatus: 'Ordered' } },
            {
                $group: {
                    _id: '$salespersonId',
                    totalOrders: { $sum: 1 },
                    totalProducts: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
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
            { $unwind: '$salesperson' },
            {
                $project: {
                    name: '$salesperson.fullName',
                    totalOrders: 1,
                    totalProducts: 1
                }
            },
            { $sort: { totalOrders: -1 } }
        ]);

        res.json(salesData);
    } catch (error) {
        console.error('Get salesperson sales error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/owner/stats/date-wise-sales
const getDateWiseSales = async (req, res) => {
    try {
        const salesData = await Order.aggregate([
            { $match: { approvalStatus: 'approved', orderStatus: 'Ordered' } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    totalOrders: { $sum: 1 },
                    totalProducts: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 } // Last 30 days
        ]);

        res.json(salesData);
    } catch (error) {
        console.error('Get date-wise sales error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /owner/reports
const getReports = async (req, res) => {
    try {
        res.render('owner/reports', {
            user: { name: req.session.userName },
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    getDashboard,
    getTotalOrders,
    getTotalSales,
    getSalespersonSales,
    getDateWiseSales,
    getReports
};
