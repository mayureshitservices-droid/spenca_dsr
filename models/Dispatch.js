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
    invoiceNo: {
        type: String,
        trim: true
    },
    invoiceDate: {
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
    remark: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for better query performance
dispatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Dispatch', dispatchSchema);
