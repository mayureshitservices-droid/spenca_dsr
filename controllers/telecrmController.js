const Device = require('../models/Device');
const CallLog = require('../models/CallLog');

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
        const { deviceId, token, phoneNumber, callStatus, duration, timestamp, recordingUrl } = req.body;

        if (!deviceId || !token) {
            return res.status(400).json({ error: 'Device ID and token are required' });
        }

        // Validate device and token
        const device = await Device.findByIdAndToken(deviceId, token);

        if (!device) {
            return res.status(401).json({ error: 'Invalid device ID or token' });
        }

        if (!phoneNumber || !callStatus || !timestamp) {
            return res.status(400).json({ error: 'Phone number, call status, and timestamp are required' });
        }

        // Create call log
        const callLog = new CallLog({
            deviceId,
            phoneNumber,
            callStatus,
            duration: duration || 0,
            timestamp: new Date(timestamp),
            recordingUrl: recordingUrl || null
        });

        await callLog.save();

        // Update device last active
        device.lastActive = new Date();
        await device.save();

        res.status(201).json({
            success: true,
            message: 'Log synced'
        });
    } catch (error) {
        console.error('Call log submission error:', error);
        res.status(500).json({ error: 'Failed to save call log' });
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

// GET /api/telecrm/devices (for Head Office)
const getDevices = async (req, res) => {
    try {
        const devices = await Device.find().sort({ lastActive: -1 });

        // Calculate call stats for each device
        const devicesWithStats = await Promise.all(devices.map(async (device) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [totalCalls, answeredCalls, missedCalls, todayCalls] = await Promise.all([
                CallLog.countDocuments({ deviceId: device.deviceId }),
                CallLog.countDocuments({ deviceId: device.deviceId, callStatus: 'answered' }),
                CallLog.countDocuments({ deviceId: device.deviceId, callStatus: { $in: ['missed', 'rejected'] } }),
                CallLog.countDocuments({ deviceId: device.deviceId, timestamp: { $gte: today } })
            ]);

            // Calculate average call duration
            const answeredCallsWithDuration = await CallLog.find({
                deviceId: device.deviceId,
                callStatus: 'answered',
                duration: { $gt: 0 }
            });

            let avgCallDuration = '0s';
            if (answeredCallsWithDuration.length > 0) {
                const totalDuration = answeredCallsWithDuration.reduce((sum, call) => sum + call.duration, 0);
                const avgSeconds = Math.floor(totalDuration / answeredCallsWithDuration.length);
                const minutes = Math.floor(avgSeconds / 60);
                const seconds = avgSeconds % 60;
                avgCallDuration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            }

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
                    totalCalls,
                    answeredCalls,
                    missedCalls,
                    avgCallDuration,
                    todayCalls
                }
            };
        }));

        res.json(devicesWithStats);
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
};

module.exports = {
    registerDevice,
    heartbeat,
    submitCallLog,
    updateTelecaller,
    getDevices
};
