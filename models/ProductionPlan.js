const mongoose = require('mongoose');

const productionPlanSchema = new mongoose.Schema({
    factory: {
        type: String,
        required: true,
        enum: ['indapur', 'shirapur']
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    targetFinishedGoods: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        targetBoxes: {
            type: Number,
            required: true,
            min: 1
        },
        producedBoxes: {
            type: Number,
            default: 0
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('ProductionPlan', productionPlanSchema);
