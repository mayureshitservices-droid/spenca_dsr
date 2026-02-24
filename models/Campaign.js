const mongoose = require('mongoose');
const crypto = require('crypto');

const campaignSchema = new mongoose.Schema({
    campaignId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID()
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    region: {
        type: String,
        required: true,
        trim: true
    },
    totalCount: {
        type: Number,
        default: 0
    },
    deviceId: {
        type: String,
        required: true,
        ref: 'Device'
    },
    // Monitoring stats
    calledCount: {
        type: Number,
        default: 0
    },
    answeredCount: {
        type: Number,
        default: 0
    },
    missedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for faster queries by device
campaignSchema.index({ deviceId: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);
