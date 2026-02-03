const express = require('express');
const router = express.Router();
const telecrmController = require('../controllers/telecrmController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Device registration (no auth required)
router.post('/register', telecrmController.registerDevice);

// Heartbeat (requires deviceId + token)
router.post('/heartbeat', telecrmController.heartbeat);

// Submit call log (requires deviceId + token)
router.post('/call-log', telecrmController.submitCallLog);

// --- Protected Routes (Requires Head Office / SysAdmin session) ---

// Update telecaller name (requires session)
router.patch('/device/:deviceId', isAuthenticated, checkRole(['headoffice', 'sysadmin']), telecrmController.updateTelecaller);

// Get all devices with stats (for Head Office dashboard)
router.get('/devices', isAuthenticated, checkRole(['headoffice', 'sysadmin']), telecrmController.getDevices);

module.exports = router;
