const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Customer information
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    mobileNo: {
        type: String,
        trim: true
    },
    gstNo: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['Hotel', 'Gym', 'Resort', 'Water Park'],
        trim: true
    },

    // Order details
    orderStatus: {
        type: String,
        enum: ['Ordered', 'Not Ordered'],
        required: [true, 'Order status is required']
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    remark: {
        type: String,
        trim: true
    },

    // Tracking information
    salespersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gpsLocation: {
        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        },
        accuracy: {
            type: Number,
            required: true
        }
    },

    // Approval workflow
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for better query performance
orderSchema.index({ salespersonId: 1, createdAt: -1 });
orderSchema.index({ approvalStatus: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
