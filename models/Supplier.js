const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    supplierName: {
        type: String,
        required: [true, 'Supplier name is required'],
        trim: true,
        unique: true
    },
    address: {
        type: String,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    gstNo: {
        type: String,
        trim: true
    },
    paymentTerms: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

supplierSchema.index({ supplierName: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
