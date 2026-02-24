const mongoose = require('mongoose');

const campaignContactSchema = new mongoose.Schema({
    campaignId: {
        type: String,
        required: true,
        ref: 'Campaign',
        index: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit mobile number!`
        }
    },
    region: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'CALLED', 'ANSWERED', 'MISSED'],
        default: 'PENDING'
    }
}, {
    timestamps: true
});

// Compound index for unique contact per campaign
campaignContactSchema.index({ campaignId: 1, mobileNumber: 1 }, { unique: true });

module.exports = mongoose.model('CampaignContact', campaignContactSchema);
