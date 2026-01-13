const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        unique: true
    },
    address: {
        type: String,
        trim: true
    },
    mobileNo: {
        type: String,
        trim: true
    },

    category: {
        type: String,
        enum: ['Hotel', 'Gym', 'Resort', 'Water Park'],
        trim: true
    }
}, {
    timestamps: true
});

// Index for autocomplete
customerSchema.index({ customerName: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
