const mongoose = require('mongoose');
const crypto = require('crypto');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID()
    },
    deviceName: {
        type: String,
        required: true
    },
    telecaller: {
        type: String,
        default: 'Unassigned'
    },
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Method to validate token
deviceSchema.methods.validateToken = function (token) {
    return this.token === token;
};

// Static method to find device by ID and validate token
deviceSchema.statics.findByIdAndToken = async function (deviceId, token) {
    const device = await this.findOne({ deviceId });
    if (!device || !device.validateToken(token)) {
        return null;
    }
    return device;
};

module.exports = mongoose.model('Device', deviceSchema);
