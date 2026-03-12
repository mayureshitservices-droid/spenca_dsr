const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    productType: {
        type: String,
        enum: ['Finished Good', 'Raw Material'],
        default: 'Finished Good'
    },
    specification: {
        type: String,
        trim: true
    },
    uom: {
        type: String,
        trim: true
    },
    availableQty: {
        type: Number,
        default: 0
    },
    factoryStock: {
        indapur: { type: Number, default: 0 },
        shirapur: { type: Number, default: 0 }
    },
    packaging: {
        type: String,
        trim: true
    },
    isBranded: {
        type: Boolean,
        default: false
    },
    brandedCustomerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    photo: {
        type: String, // File path
        default: null
    },
    remarks: {
        type: String,
        trim: true
    },
    components: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quantity: Number,
        uom: String
    }]
}, {
    timestamps: true
});

// Sync availableQty with the sum of factoryStock
productSchema.pre('save', function (next) {
    this.availableQty = (this.factoryStock.indapur || 0) + (this.factoryStock.shirapur || 0);
    next();
});

module.exports = mongoose.model('Product', productSchema);
