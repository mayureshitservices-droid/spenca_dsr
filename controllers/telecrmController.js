const Device = require('../models/Device');
const CallLog = require('../models/CallLog');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CampaignContact = require('../models/CampaignContact');
const exceljs = require('exceljs');
const telecrmService = require('../services/telecrmService');

// POST /api/telecrm/register
const registerDevice = async (req, res) => {
    try {
        const { deviceName } = req.body;

        if (!deviceName) {
            return res.status(400).json({ error: 'Device name is required' });
        }

        // Create new device
        const device = new Device({
            deviceName,
            telecaller: 'Unassigned',
            status: 'online',
            lastActive: new Date()
        });

        await device.save();

        res.status(201).json({
            success: true,
            message: 'Device registered successfully',
            deviceId: device.deviceId,
            token: device.token
        });
    } catch (error) {
        console.error('Device registration error:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
};

// POST /api/telecrm/heartbeat
const heartbeat = async (req, res) => {
    try {
        const device = req.device;

        // Update status and last active
        device.status = 'online';
        device.lastActive = new Date();
        await device.save();

        console.log(`[Heartbeat] Updated for device: ${device.deviceId}`);

        res.json({
            success: true,
            status: 'online',
            telecaller: device.telecaller
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update device status' });
    }
};

// POST /api/telecrm/call-log
const submitCallLog = async (req, res) => {
    try {
        const { callId, phoneNumber, callStatus, duration, timestamp, recordingUrl } = req.body;
        const device = req.device;
        const deviceId = device.deviceId;

        if (!callId || !phoneNumber || !callStatus || !timestamp) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        await telecrmService.syncCallLog({
            callId, deviceId, phoneNumber, callStatus, duration, timestamp, recordingUrl
        });

        // Update device last active
        device.lastActive = new Date();
        await device.save();

        res.status(201).json({ success: true, message: 'Log synced' });
    } catch (error) {
        console.error('Call log submission error:', error);
        res.status(500).json({ success: false, error: 'Failed to save call log' });
    }
};

// POST /api/telecrm/call-outcome
const submitCallOutcome = async (req, res) => {
    try {
        const data = req.body;
        const device = req.device;
        const deviceId = device.deviceId;

        if (!data.callId) {
            return res.status(400).json({ success: false, error: 'Call ID is required' });
        }

        // Fetch original log to get phoneNumber if not provided in body
        const log = await CallLog.findOne({ callId: data.callId });
        const phoneNumber = data.phoneNumber || (log ? log.phoneNumber : null);

        await telecrmService.syncCallOutcome({ ...data, deviceId, phoneNumber });

        // Update device last active
        device.lastActive = new Date();
        await device.save();

        res.json({ success: true, message: 'Outcome saved successfully' });
    } catch (error) {
        console.error('Call outcome submission error:', error);
        res.status(500).json({ success: false, error: 'Failed to save call outcome' });
    }
};


// PATCH /api/telecrm/device/:deviceId
const updateTelecaller = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { token, telecaller } = req.body;

        if (!telecaller) {
            return res.status(400).json({ error: 'Telecaller name is required' });
        }

        let device;

        // Check if this is a Head Office/SysAdmin update from the dashboard (session-based)
        if (req.session && (req.session.userRole === 'headoffice' || req.session.userRole === 'sysadmin')) {
            device = await Device.findOne({ deviceId });
        } else {
            // Otherwise, it must be a device self-update (token-based)
            if (!token) {
                return res.status(400).json({ error: 'Token is required for device self-update' });
            }
            device = await Device.findByIdAndToken(deviceId, token);
        }

        if (!device) {
            return res.status(req.session && req.session.userId ? 404 : 401).json({
                error: req.session && req.session.userId ? 'Device not found' : 'Invalid device ID or token'
            });
        }

        device.telecaller = telecaller;
        await device.save();

        res.json({
            success: true,
            message: 'Telecaller name updated successfully'
        });
    } catch (error) {
        console.error('Update telecaller error:', error);
        res.status(500).json({ error: 'Failed to update telecaller name' });
    }
};

// Helper to format duration
const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return '0s';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

// GET /api/telecrm/devices (for Head Office)
const getDevices = async (req, res) => {
    try {
        const devicesWithStats = await telecrmService.fetchDevicesWithStats();
        res.json(devicesWithStats);
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
};

// POST /api/telecrm/upload-recording
const uploadRecording = async (req, res) => {
    try {
        const { callId } = req.body;
        const file = req.file;
        const device = req.device;
        const deviceId = device.deviceId;

        console.log(`[Upload] Received upload request: deviceId=${deviceId}, callId=${callId}`);
        if (file) {
            console.log(`[Upload] File details: name=${file.originalname}, size=${file.size} bytes, type=${file.mimetype}`);
        } else {
            console.error('[Upload] No file provided in the request');
        }

        if (!callId || !file) {
            return res.status(400).json({ success: false, error: 'Call ID and file are required' });
        }

        // Upload to OCI
        const ociService = require('../services/ociService');
        const fileName = `${callId}${require('path').extname(file.originalname)}`;

        console.log(`[Upload] Starting OCI upload for: ${fileName}`);
        const recordingUrl = await ociService.uploadToOCI(file.buffer, fileName, file.mimetype);
        console.log(`[Upload] OCI upload successful. PAR URL: ${recordingUrl}`);

        // Update CallLog with recordingUrl
        console.log(`[Upload] Updating database for callId: ${callId}`);
        const log = await CallLog.findOneAndUpdate(
            { callId },
            { recordingUrl },
            { new: true }
        );

        if (!log) {
            // If log doesn't exist yet, we can create it or just return error
            // Usually metadata arrives first, but we handle both two-stage cases
            await new CallLog({
                deviceId,
                callId,
                recordingUrl
            }).save();
        }

        res.status(200).json({
            success: true,
            message: 'Recording uploaded and linked',
            recordingUrl
        });

    } catch (error) {
        console.error('Recording upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload recording: ' + error.message });
    }
};

// --- Campaign Management (Admin) ---

// POST /api/telecrm/campaigns
const createCampaign = async (req, res) => {
    try {
        const { name, region, deviceId } = req.body;
        const file = req.file;

        if (!name || !region || !deviceId || !file) {
            return res.status(400).json({ success: false, error: 'Name, region, deviceId, and Excel file are required' });
        }

        const campaign = await telecrmService.createCampaign({ name, region, deviceId }, file.buffer);

        res.status(201).json({
            success: true,
            message: `Campaign "${name}" created with ${campaign.totalCount} contacts`,
            campaignId: campaign.campaignId
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(error.message.includes('valid') ? 400 : 500).json({ 
            success: false, 
            error: error.message || 'Failed to create campaign' 
        });
    }
};

// GET /api/telecrm/admin/campaigns (For Monitoring)
const getCampaignsForAdmin = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'deviceId',
                model: 'Device',
                localField: 'deviceId',
                foreignField: 'deviceId',
                select: 'deviceName telecaller'
            });

        res.json(campaigns);
    } catch (error) {
        console.error('Get admin campaigns error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
};

// --- Campaign API (Android App) ---

// GET /api/telecrm/campaigns
// Accepts deviceId + token from query params, body, or headers (via authenticateDevice middleware)
const getCampaigns = async (req, res) => {
    try {
        const device = req.device; // Set by authenticateDevice middleware
        const deviceId = device.deviceId;

        console.log(`[Campaigns] Request — method: ${req.method}, deviceId: ${deviceId}`);

        const results = await telecrmService.getCampaignsForDevice(deviceId);
        console.log(`[Campaigns] Found ${results.length} active campaign(s) for device ${deviceId}`);

        res.json(results);
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json([]); // Always return an array to prevent crashes in Android app
    }
};


// POST /api/telecrm/campaigns/sync-stats
const syncCampaignStats = async (req, res) => {
    try {
        const { campaignId, calledCount, answeredCount, missedCount } = req.body;
        const device = req.device;
        const deviceId = device.deviceId;

        if (!campaignId) {
            return res.status(400).json({ success: false, error: 'Campaign ID is required' });
        }

        await Campaign.findOneAndUpdate(
            { campaignId, deviceId },
            { calledCount, answeredCount, missedCount },
            { new: true }
        );

        res.json({ success: true, message: 'Stats synced' });
    } catch (error) {
        console.error('Sync campaign stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to sync stats' });
    }
};

// GET /api/telecrm/device/:deviceId/logs
const getDeviceLogs = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const query = { deviceId };

        // Search Filter
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
                { outcome: { $regex: search, $options: 'i' } },
                { callStatus: { $regex: search, $options: 'i' } },
                { distributor: { $regex: search, $options: 'i' } },
                { remarks: { $regex: search, $options: 'i' } }
            ];
        }

        // Date Range Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.timestamp = { $gte: start, $lte: end };
        }

        const skip = (page - 1) * limit;

        const totalRecords = await CallLog.countDocuments(query);
        const logs = await CallLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const enrichedLogs = await telecrmService.enrichCallLogs(logs);

        res.json({
            success: true,
            logs: enrichedLogs,
            pagination: {
                totalCount: totalRecords,
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Get device logs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
};

module.exports = {
    registerDevice,
    heartbeat,
    submitCallLog,
    submitCallOutcome,
    updateTelecaller,
    getDevices,
    uploadRecording,
    createCampaign,
    getCampaignsForAdmin,
    getCampaigns,
    syncCampaignStats,
    getDeviceLogs
};
