const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and owner role
router.use(isAuthenticated);
router.use(checkRole(['owner']));

// Dashboard
router.get('/dashboard', ownerController.getDashboard);
router.get('/reports', ownerController.getReports);

module.exports = router;
