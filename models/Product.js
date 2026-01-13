const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    packaging: {
        type: String,
        trim: true
    },

    photo: {
        type: String, // File path
        default: null
    },
    remarks: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
