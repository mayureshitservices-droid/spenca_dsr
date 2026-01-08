const express = require('express');
const router = express.Router();
const salesHeadController = require('../controllers/salesHeadController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and sales_head role
router.use(isAuthenticated);
router.use(checkRole(['sales_head']));

// Dashboard
router.get('/dashboard', salesHeadController.getDashboard);

// Orders
router.get('/pending-orders', salesHeadController.getPendingOrders);
router.get('/all-orders', salesHeadController.getAllOrders);

// Approval actions
router.post('/orders/:id/approve', salesHeadController.approveOrder);
router.post('/orders/:id/reject', salesHeadController.rejectOrder);

module.exports = router;
