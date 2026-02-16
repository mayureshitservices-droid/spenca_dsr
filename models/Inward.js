const mongoose = require('mongoose');

const inwardSchema = new mongoose.Schema({
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    supplierName: String,
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: String,
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    gstPercentage: {
        type: Number,
        required: true
    },
    conditionConfirmed: {
        type: Boolean,
        default: false,
        required: true
    },
    invoiceNo: {
        type: String,
        trim: true
    },
    invoiceDate: {
        type: Date
    },
    inwardDate: {
        type: Date,
        default: Date.now
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Inward', inwardSchema);
