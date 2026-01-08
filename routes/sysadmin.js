const express = require('express');
const router = express.Router();
const sysadminController = require('../controllers/sysadminController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and sysadmin role
router.use(isAuthenticated);
router.use(checkRole(['sysadmin']));

// Dashboard
router.get('/dashboard', sysadminController.getDashboard);

// User management
router.get('/users', sysadminController.getUsers);
router.post('/users/create', sysadminController.createUser);
router.patch('/users/:id/toggle-status', sysadminController.toggleUserStatus);

// Product management
router.get('/products', sysadminController.getProducts);
router.post('/products/create', sysadminController.upload.single('photo'), sysadminController.createProduct);
router.delete('/products/:id', sysadminController.deleteProduct);

module.exports = router;
