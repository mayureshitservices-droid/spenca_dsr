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
                    // Try to find the latest order/visit for this phone number to get business context
                    const latestOrder = await Order.findOne({ mobileNo: log.phoneNumber })
                        .sort({ createdAt: -1 });

                    return {
                        timestamp: log.timestamp,
                        phoneNumber: log.phoneNumber,
                        callStatus: log.callStatus,
                        duration: formatDuration(log.duration),
                        customerName: latestOrder ? latestOrder.customerName : 'New Customer',
                        outcome: latestOrder ? latestOrder.orderStatus : 'No Interaction',
                        reminder: latestOrder && latestOrder.tentativeRepeatDate ? latestOrder.tentativeRepeatDate : null,
                        orderDetails: latestOrder && latestOrder.products ? latestOrder.products.map(p => `${p.productName} (x${p.quantity})`).join(', ') : 'N/A',
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

module.exports = {
    registerDevice,
    heartbeat,
    submitCallLog,
    updateTelecaller,
    getDevices,
    fetchDevicesWithStats // Exported for use in other controllers
};
