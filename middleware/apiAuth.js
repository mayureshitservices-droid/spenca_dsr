const Device = require('../models/Device');

/**
 * Middleware to authenticate a device using deviceId and token.
 * Searches in query parameters, request body, and custom headers.
 */
const authenticateDevice = async (req, res, next) => {
    try {
        const deviceId = req.query.deviceId || req.body.deviceId || req.headers['x-device-id'];
        const token = req.query.token || req.body.token || req.headers['x-device-token'];

        if (!deviceId || !token) {
            return res.status(401).json({
                success: false,
                error: 'Device ID and token are required'
            });
        }

        const device = await Device.findByIdAndToken(deviceId, token);

        if (!device) {
            return res.status(401).json({
                success: false,
                error: 'Invalid device ID or token'
            });
        }

        // Attach device to request for use in controllers
        req.device = device;
        next();
    } catch (error) {
        console.error('API Authentication Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during authentication'
        });
    }
};

module.exports = { authenticateDevice };
