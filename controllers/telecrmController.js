const Device = require('../models/Device');
const CallLog = require('../models/CallLog');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CampaignContact = require('../models/CampaignContact');
const exceljs = require('exceljs');

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

        if (!callId) {
            return res.status(400).json({ success: false, error: 'Call ID is required' });
        }

        if (!phoneNumber || !callStatus || !timestamp) {
            return res.status(400).json({ success: false, error: 'Phone number, call status, and timestamp are required' });
        }

        // Upsert call log using callId
        await CallLog.findOneAndUpdate(
            { callId },
            {
                deviceId,
                phoneNumber,
                callStatus: callStatus.toLowerCase(),
                duration: duration || 0,
                timestamp: new Date(timestamp),
                recordingUrl: recordingUrl || null
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Update device last active
        device.lastActive = new Date();
        await device.save();

        // --- Automatic Campaign Update ---
        try {
            const activeCampaigns = await Campaign.find({ deviceId, status: 'active' });
            for (const campaign of activeCampaigns) {
                const contact = await CampaignContact.findOne({
                    campaignId: campaign.campaignId,
                    mobileNumber: phoneNumber
                });

                if (contact && contact.status === 'PENDING') {
                    contact.status = 'CALLED';
                    await contact.save();
                    await Campaign.findOneAndUpdate(
                        { campaignId: campaign.campaignId },
                        { $inc: { calledCount: 1 } }
                    );
                }
            }
        } catch (err) {
            console.error('[Campaign Sync] Error during auto-update in call-log:', err);
        }
        // ---------------------------------

        res.status(201).json({
            success: true,
            message: 'Log synced'
        });
    } catch (error) {
        console.error('Call log submission error:', error);
        res.status(500).json({ success: false, error: 'Failed to save call log' });
    }
};


// POST /api/telecrm/call-outcome
const submitCallOutcome = async (req, res) => {
    try {
        const {
            callId,
            customerName,
            outcome,
            remarks,
            followUpDate,
            productQuantities,
            needBranding,
            reasonForLoss,
            distributor
        } = req.body;
        const device = req.device;
        const deviceId = device.deviceId;

        if (!callId) {
            return res.status(400).json({ success: false, error: 'Call ID is required' });
        }

        // Upsert call log with outcome details using callId
        await CallLog.findOneAndUpdate(
            { callId },
            {
                deviceId,
                customerName,
                outcome,
                remarks,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                productQuantities: productQuantities || {},
                needBranding: !!needBranding,
                reasonForLoss,
                distributor
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Update device last active
        device.lastActive = new Date();
        await device.save();

        // --- Automatic Campaign Update (Outcome) ---
        try {
            const log = await CallLog.findOne({ callId });
            if (log && log.phoneNumber) {
                const activeCampaigns = await Campaign.find({ deviceId, status: 'active' });
                for (const campaign of activeCampaigns) {
                    const contact = await CampaignContact.findOne({
                        campaignId: campaign.campaignId,
                        mobileNumber: log.phoneNumber
                    });

                    if (contact) {
                        const oldStatus = contact.status;
                        const isSuccess = ['Ordered', 'Regular Customer', 'Interested', 'Follow Up Required'].includes(outcome);
                        const isLoss = ['Not Interested', 'Reason for Loss', 'Lost', 'Call Not Answered', 'No Interaction'].includes(outcome);

                        let newStatus = oldStatus;
                        if (isSuccess) newStatus = 'ANSWERED';
                        else if (isLoss) newStatus = 'MISSED';

                        if (newStatus !== oldStatus) {
                            contact.status = newStatus;
                            await contact.save();

                            const update = { $inc: {} };
                            if (oldStatus === 'PENDING') update.$inc.calledCount = 1;

                            if (newStatus === 'ANSWERED') {
                                update.$inc.answeredCount = 1;
                                if (oldStatus === 'MISSED') update.$inc.missedCount = -1;
                            } else if (newStatus === 'MISSED') {
                                update.$inc.missedCount = 1;
                                if (oldStatus === 'ANSWERED') update.$inc.answeredCount = -1;
                            }

                            if (Object.keys(update.$inc).length > 0) {
                                await Campaign.findOneAndUpdate({ campaignId: campaign.campaignId }, update);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Campaign Sync] Error during auto-update in call-outcome:', err);
        }
        // -------------------------------------------

        res.json({
            success: true,
            message: 'Outcome saved successfully'
        });
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

// Helper function to fetch devices with stats
const fetchDevicesWithStats = async () => {
    const devices = await Device.find().sort({ lastActive: -1 });

    return await Promise.all(devices.map(async (device) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

        // Fetch stats using aggregation for better performance and duration summing
        const getStatsForRange = async (startDate) => {
            const result = await CallLog.aggregate([
                {
                    $match: {
                        deviceId: device.deviceId,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        answered: {
                            $sum: {
                                $cond: [{ $in: ['$callStatus', ['answered', 'outgoing']] }, 1, 0]
                            }
                        },
                        missed: {
                            $sum: {
                                $cond: [{ $in: ['$callStatus', ['missed', 'rejected', 'incoming', 'blocked']] }, 1, 0]
                            }
                        },
                        duration: { $sum: { $ifNull: ['$duration', 0] } }
                    }
                }
            ]);

            const stats = result[0] || { total: 0, answered: 0, missed: 0, duration: 0 };
            return {
                total: stats.total,
                answered: stats.answered,
                missed: stats.missed,
                duration: formatDuration(stats.duration)
            };
        };

        const [todayStats, monthStats, totalAllTime] = await Promise.all([
            getStatsForRange(todayStart),
            getStatsForRange(monthStart),
            CallLog.countDocuments({ deviceId: device.deviceId })
        ]);

        // Determine status (offline if last active > 5 minutes ago)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
        const status = device.lastActive > fiveMinutesAgo ? 'online' : 'offline';

        return {
            id: device.deviceId,
            name: device.deviceName,
            telecaller: device.telecaller,
            status,
            lastActive: device.lastActive,
            callStats: {
                totalCalls: totalAllTime,
                today: todayStats,
                month: monthStats
            },
            history: await Promise.all((await CallLog.find({ deviceId: device.deviceId })
                .sort({ timestamp: -1 })
                .limit(50))
                .map(async (log) => {
                    // Prioritize data from the new two-stage logging endpoint
                    let customerName = log.customerName;
                    let outcome = log.outcome;
                    let reminder = log.followUpDate;
                    let orderDetails = log.productQuantities && Object.keys(log.productQuantities).length > 0
                        ? Object.entries(log.productQuantities).map(([p, q]) => `${p} (x${q})`).join(', ')
                        : null;
                    let distributor = log.distributor;

                    // Fallback to legacy Order lookup if no outcome was manually provided via the new endpoint
                    if (!outcome || outcome === 'No Interaction') {
                        const latestOrder = await Order.findOne({ mobileNo: log.phoneNumber })
                            .sort({ createdAt: -1 });

                        if (latestOrder) {
                            customerName = customerName || latestOrder.customerName;
                            outcome = outcome === 'No Interaction' ? latestOrder.orderStatus : outcome;
                            reminder = reminder || latestOrder.tentativeRepeatDate;
                            orderDetails = orderDetails || (latestOrder.products ? latestOrder.products.map(p => `${p.productName} (x${p.quantity})`).join(', ') : 'N/A');
                        }
                    }

                    return {
                        timestamp: log.timestamp || log.createdAt,
                        phoneNumber: log.phoneNumber || 'Unknown',
                        callStatus: log.callStatus || 'Unknown',
                        duration: formatDuration(log.duration),
                        customerName: customerName || 'New Customer',
                        outcome: outcome || 'No Interaction',
                        reminder: reminder || null,
                        remarks: log.remarks || '',
                        orderDetails: orderDetails || 'N/A',
                        distributor: distributor || 'Main Branch',
                        recordingUrl: log.recordingUrl
                    };
                }))
        };
    }));
};

// GET /api/telecrm/devices (for Head Office)
const getDevices = async (req, res) => {
    try {
        const devicesWithStats = await fetchDevicesWithStats();
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

        // Verify device exists
        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ success: false, error: 'Target device not found' });
        }

        const workbook = new exceljs.Workbook();
        await workbook.xlsx.load(file.buffer);
        const worksheet = workbook.getWorksheet(1);

        const contacts = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const customerName = row.getCell(1).value?.toString() || 'Unknown';
            let mobileNumber = row.getCell(2).value?.toString().replace(/\D/g, '') || '';
            const contactRegion = row.getCell(3).value?.toString() || region;

            // Simple validation: 10 digits
            if (mobileNumber.length === 10) {
                contacts.push({
                    customerName,
                    mobileNumber,
                    region: contactRegion
                });
            }
        });

        if (contacts.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid contacts found in the uploaded file' });
        }

        // Create Campaign
        const campaign = new Campaign({
            name,
            region,
            deviceId,
            totalCount: contacts.length
        });

        await campaign.save();

        // Create Contacts
        const campaignContacts = contacts.map(c => ({
            ...c,
            campaignId: campaign.campaignId
        }));

        await CampaignContact.insertMany(campaignContacts);

        res.status(201).json({
            success: true,
            message: `Campaign "${name}" created with ${contacts.length} contacts`,
            campaignId: campaign.campaignId
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ success: false, error: 'Failed to create campaign' });
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

        const campaigns = await Campaign.find({ deviceId, status: 'active' });
        console.log(`[Campaigns] Found ${campaigns.length} active campaign(s) for device ${deviceId}`);

        const results = await Promise.all(campaigns.map(async (c) => {
            const contacts = await CampaignContact.find({ campaignId: c.campaignId })
                .select('customerName mobileNumber region status -_id');

            return {
                id: c.campaignId,
                name: c.name,
                region: c.region,
                totalCount: c.totalCount,
                calledCount: c.calledCount,
                answeredCount: c.answeredCount,
                missedCount: c.missedCount,
                contacts
            };
        }));

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

module.exports = {
    registerDevice,
    heartbeat,
    submitCallLog,
    submitCallOutcome,
    updateTelecaller,
    getDevices,
    fetchDevicesWithStats,
    uploadRecording,
    createCampaign,
    getCampaignsForAdmin,
    getCampaigns,
    syncCampaignStats
};
