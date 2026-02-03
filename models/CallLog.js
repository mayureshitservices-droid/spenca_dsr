const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        ref: 'Device'
    },
    callId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: false // Optional initially as /call-outcome might arrive first
    },
    callStatus: {
        type: String,
        enum: ['incoming', 'outgoing', 'missed', 'rejected', 'blocked', 'answered'],
        lowercase: true,
        required: false
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    timestamp: {
        type: Date,
        required: false
    },
    recordingUrl: {
        type: String, // OCI Object Storage URL
        default: null
    },
    // Outcome Form Details
    customerName: String,
    outcome: {
        type: String,
        enum: ['Ordered', 'Call Later', 'Other Concerns', 'Lost', 'No Interaction'],
        default: 'No Interaction'
    },
    remarks: String,
    followUpDate: Date,
    productQuantities: {
        type: mongoose.Schema.Types.Mixed, // Dynamic product name/quantity pairs
        default: {}
    },
    needBranding: {
        type: Boolean,
        default: false
    },
    reasonForLoss: String,
    distributor: String
}, {
    timestamps: true
});

// Index for faster queries
callLogSchema.index({ deviceId: 1, timestamp: -1 });
callLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
