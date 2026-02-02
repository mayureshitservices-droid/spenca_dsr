const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4()
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
        unique: true
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

// Generate secure token before saving
deviceSchema.pre('save', function (next) {
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    next();
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
