const express = require('express');
const router = express.Router();
const telecrmController = require('../controllers/telecrmController');

// Device registration (no auth required)
router.post('/register', telecrmController.registerDevice);

// Heartbeat (requires deviceId + token)
router.post('/heartbeat', telecrmController.heartbeat);

// Submit call log (requires deviceId + token)
router.post('/call-log', telecrmController.submitCallLog);

// Update telecaller name (requires deviceId + token)
router.patch('/device/:deviceId', telecrmController.updateTelecaller);

// Get all devices with stats (for Head Office dashboard)
router.get('/devices', telecrmController.getDevices);

module.exports = router;
