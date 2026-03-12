const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.01
    },
    dispatchDate: {
        type: Date,
        default: Date.now
    },
    receiverName: {
        type: String,
        required: true,
        trim: true
    },
    dcNo: {
        type: String,
        trim: true
    },
    dcDate: {
        type: Date
    },
    vehicleNo: {
        type: String,
        trim: true
    },
    driverName: {
        type: String,
        trim: true
    },
    driverMobileNo: {
        type: String,
        trim: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    factory: {
        type: String,
        enum: ['indapur', 'shirapur'],
        required: true,
        default: 'indapur'
    },
    remark: {
        type: String,
        trim: true
    },
    dcPhoto: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for better query performance
dispatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Dispatch', dispatchSchema);
