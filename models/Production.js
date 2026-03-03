const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
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
    batchNo: {
        type: String,
        required: true,
        trim: true
    },
    shift: {
        type: String,
        enum: ['1st', '2nd', '3rd'],
        required: true
    },
    remarks: {
        type: String,
        trim: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for better query performance
productionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Production', productionSchema);
