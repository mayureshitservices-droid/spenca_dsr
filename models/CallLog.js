const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        ref: 'Device'
    },
    phoneNumber: {
        type: String,
        required: true
    },
    callStatus: {
        type: String,
        enum: ['incoming', 'outgoing', 'missed', 'rejected', 'blocked', 'answered'],
        required: true,
        lowercase: true
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    timestamp: {
        type: Date,
        required: true
    },
    recordingUrl: {
        type: String, // OCI Object Storage URL
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
callLogSchema.index({ deviceId: 1, timestamp: -1 });
callLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
