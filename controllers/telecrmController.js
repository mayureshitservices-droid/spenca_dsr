const Device = require('../models/Device');
const CallLog = require('../models/CallLog');
const Order = require('../models/Order');

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
        const { deviceId, token } = req.body;

        if (!deviceId || !token) {
            return res.status(400).json({ error: 'Device ID and token are required' });
        }

        const device = await Device.findByIdAndToken(deviceId, token);

        if (!device) {
            return res.status(401).json({ error: 'Invalid device ID or token' });
        }

        // Update status and last active
        device.status = 'online';
        device.lastActive = new Date();
        await device.save();

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
        const { deviceId, token, callId, phoneNumber, callStatus, duration, timestamp, recordingUrl } = req.body;

        if (!deviceId || !token || !callId) {
            return res.status(400).json({ success: false, error: 'Device ID, token, and call ID are required' });
        }

        // Validate device and token
        const device = await Device.findByIdAndToken(deviceId, token);

        if (!device) {
            return res.status(401).json({ success: false, error: 'Invalid device ID or token' });
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
            deviceId,
            token,
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

        if (!deviceId || !token || !callId) {
            return res.status(400).json({ success: false, error: 'Device ID, token, and call ID are required' });
        }

        // Validate device and token
        const device = await Device.findByIdAndToken(deviceId, token);

        if (!device) {
            return res.status(401).json({ success: false, error: 'Invalid device ID or token' });
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
        const { deviceId, token, callId } = req.body;
        const file = req.file;

        if (!deviceId || !token || !callId || !file) {
            return res.status(400).json({ success: false, error: 'Device ID, token, call ID, and file are required' });
        }

        // Validate device and token
        const device = await Device.findByIdAndToken(deviceId, token);
        if (!device) {
            return res.status(401).json({ success: false, error: 'Invalid device ID or token' });
        }

        // Upload to OCI
        const ociService = require('../services/ociService');
        const fileName = `${callId}${require('path').extname(file.originalname)}`;

        const recordingUrl = await ociService.uploadToOCI(file.buffer, fileName, file.mimetype);

        // Update CallLog with recordingUrl
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

module.exports = {
    registerDevice,
    heartbeat,
    submitCallLog,
    submitCallOutcome,
    updateTelecaller,
    getDevices,
    fetchDevicesWithStats,
    uploadRecording
};
