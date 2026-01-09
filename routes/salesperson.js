const express = require('express');
const router = express.Router();
const salespersonController = require('../controllers/salespersonController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and salesperson role
router.use(isAuthenticated);
router.use(checkRole(['salesperson']));

// Dashboard
router.get('/dashboard', salespersonController.getDashboard);

// Order creation
router.get('/create-order', salespersonController.getCreateOrder);
router.post('/orders/create', salespersonController.createOrder);

// View orders
router.get('/orders', salespersonController.getOrders);

// Reminders
router.get('/reminders', salespersonController.getReminders);
router.post('/reminders/reschedule', salespersonController.rescheduleReminder);

module.exports = router;
