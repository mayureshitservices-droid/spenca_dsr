const express = require('express');
const router = express.Router();
const telecrmController = require('../controllers/telecrmController');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { authenticateDevice } = require('../middleware/apiAuth');

// Device registration (no auth required)
router.post('/register', telecrmController.registerDevice);

// Heartbeat (requires deviceId + token)
router.post('/heartbeat', authenticateDevice, telecrmController.heartbeat);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Submit call log (requires deviceId + token)
router.post('/call-log', authenticateDevice, telecrmController.submitCallLog);

// Upload call recording file (requires deviceId + token)
router.post('/upload-recording', authenticateDevice, upload.single('file'), telecrmController.uploadRecording);

// Submit call outcome/form (requires deviceId + token)
router.post('/call-outcome', authenticateDevice, telecrmController.submitCallOutcome);

// --- Campaign API (Android App) ---

// Get campaigns for device (GET with query params OR POST with body)
router.get('/campaigns', authenticateDevice, telecrmController.getCampaigns);
router.post('/campaigns/fetch', authenticateDevice, telecrmController.getCampaigns);  // POST alias for Android

// Sync campaign stats
router.post('/campaigns/sync-stats', authenticateDevice, telecrmController.syncCampaignStats);

// --- Protected Routes (Requires Head Office / SysAdmin session) ---

// Create new campaign (requires Excel upload)
router.post('/campaigns', isAuthenticated, checkRole(['headoffice', 'sysadmin']), upload.single('file'), telecrmController.createCampaign);

// Get all campaigns with stats (for monitoring)
router.get('/admin/campaigns', isAuthenticated, checkRole(['headoffice', 'sysadmin']), telecrmController.getCampaignsForAdmin);

// Update telecaller name (requires session)
router.patch('/device/:deviceId', isAuthenticated, checkRole(['headoffice', 'sysadmin']), telecrmController.updateTelecaller);

// Get all devices with stats (for Head Office dashboard)
router.get('/devices', isAuthenticated, checkRole(['headoffice', 'sysadmin']), telecrmController.getDevices);

module.exports = router;
