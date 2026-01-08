const express = require('express');
const router = express.Router();
const salespersonController = require('../controllers/salespersonController');
const ownerController = require('../controllers/ownerController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// API routes for autocomplete (accessible by salesperson)
router.use(isAuthenticated);

router.get('/customers/search', salespersonController.searchCustomers);
router.get('/customers/:id', salespersonController.getCustomer);
router.get('/products/search', salespersonController.searchProducts);

// Owner stats API (accessible by owner)
router.get('/owner/stats/total-orders', checkRole(['owner']), ownerController.getTotalOrders);
router.get('/owner/stats/total-sales', checkRole(['owner']), ownerController.getTotalSales);
router.get('/owner/stats/salesperson-sales', checkRole(['owner']), ownerController.getSalespersonSales);
router.get('/owner/stats/date-wise-sales', checkRole(['owner']), ownerController.getDateWiseSales);

module.exports = router;
