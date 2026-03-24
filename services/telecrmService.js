const Device = require('../models/Device');
const CallLog = require('../models/CallLog');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');
const CampaignContact = require('../models/CampaignContact');

/**
 * Format duration in seconds to human readable string
 */
const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return '0s';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

/**
 * Update campaign stats based on call logs or outcomes
 */
const updateCampaignStats = async (deviceId, phoneNumber, outcome = null) => {
    try {
        const activeCampaigns = await Campaign.find({ deviceId, status: 'active' });
        for (const campaign of activeCampaigns) {
            const contact = await CampaignContact.findOne({
                campaignId: campaign.campaignId,
                mobileNumber: phoneNumber
            });

            if (!contact) continue;

            const oldStatus = contact.status;
            let newStatus = oldStatus;

            if (outcome) {
                const isSuccess = ['Ordered', 'Regular Customer', 'Interested', 'Follow Up Required'].includes(outcome);
                const isLoss = ['Not Interested', 'Reason for Loss', 'Lost', 'Call Not Answered', 'No Interaction'].includes(outcome);
                
                if (isSuccess) newStatus = 'ANSWERED';
                else if (isLoss) newStatus = 'MISSED';
            } else if (oldStatus === 'PENDING') {
                newStatus = 'CALLED';
            }

            if (newStatus !== oldStatus) {
                contact.status = newStatus;
                await contact.save();

                const update = { $inc: {} };
                if (oldStatus === 'PENDING') update.$inc.calledCount = 1;

                if (newStatus === 'ANSWERED') {
                    update.$inc.answeredCount = 1;
                    if (oldStatus === 'MISSED') update.$inc.missedCount = -1;
                } else if (newStatus === 'MISSED') {
                    update.$inc.missedCount = 1;
                    if (oldStatus === 'ANSWERED') update.$inc.answeredCount = -1;
                }

                if (Object.keys(update.$inc).length > 0) {
                    await Campaign.findOneAndUpdate({ campaignId: campaign.campaignId }, update);
                }
            }
        }
    } catch (err) {
        console.error('[Campaign Sync] Error:', err);
    }
};

/**
 * Sync or create a call log entry
 */
const syncCallLog = async (data) => {
    const { callId, deviceId, phoneNumber, callStatus, duration, timestamp, recordingUrl } = data;
    
    await CallLog.findOneAndUpdate(
        { callId },
        {
            deviceId,
            phoneNumber,
            callStatus: callStatus.toLowerCase(),
            duration: duration || 0,
            timestamp: new Date(timestamp),
            recordingUrl: recordingUrl || null
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Trigger campaign update (initial call)
    await updateCampaignStats(deviceId, phoneNumber);
};

/**
 * Sync call outcome and enrich with customer/order data
 */
const syncCallOutcome = async (data) => {
    const { callId, deviceId, phoneNumber, customerName, outcome, remarks, followUpDate, productQuantities, needBranding, reasonForLoss, distributor } = data;

    await CallLog.findOneAndUpdate(
        { callId },
        {
            deviceId,
            customerName,
            outcome,
            remarks,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            productQuantities: productQuantities || {},
            needBranding: !!needBranding,
            reasonForLoss,
            distributor
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Trigger campaign update (with outcome)
    if (phoneNumber) {
        await updateCampaignStats(deviceId, phoneNumber, outcome);
    }
};

/**
 * Fetch devices with detailed call statistics
 */
const fetchDevicesWithStats = async () => {
    const devices = await Device.find().sort({ lastActive: -1 });

    return await Promise.all(devices.map(async (device) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

        const getStatsForRange = async (startDate) => {
            const result = await CallLog.aggregate([
                {
                    $match: {
                        deviceId: device.deviceId,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $addFields: {
                        // Sum up all values in the productQuantities object
                        callBoxes: {
                            $reduce: {
                                input: { $objectToArray: { $ifNull: ['$productQuantities', {}] } },
                                initialValue: 0,
                                in: { $add: ['$$value', { $convert: { input: '$$this.v', to: 'int', onError: 0, onNull: 0 } }] }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        answered: {
                            $sum: { $cond: [{ $in: ['$callStatus', ['answered', 'outgoing']] }, 1, 0] }
                        },
                        missed: {
                            $sum: { $cond: [{ $in: ['$callStatus', ['missed', 'rejected', 'incoming', 'blocked']] }, 1, 0] }
                        },
                        duration: { $sum: { $ifNull: ['$duration', 0] } },
                        boxes: { $sum: '$callBoxes' }
                    }
                }
            ]);

            const stats = result[0] || { total: 0, answered: 0, missed: 0, duration: 0, boxes: 0 };
            return {
                total: stats.total,
                answered: stats.answered,
                missed: stats.missed,
                duration: formatDuration(stats.duration),
                boxes: stats.boxes || 0
            };
        };

        const [todayStats, monthStats, totalAllTime] = await Promise.all([
            getStatsForRange(todayStart),
            getStatsForRange(monthStart),
            CallLog.countDocuments({ deviceId: device.deviceId })
        ]);

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
        const status = device.lastActive > fiveMinutesAgo ? 'online' : 'offline';

        return {
            id: device.deviceId,
            name: device.deviceName,
            telecaller: device.telecaller,
            status,
            lastActive: device.lastActive,
            callStats: {
                totalCalls: totalAllTime,
                today: todayStats,
                month: monthStats
            },
            history: [] // History is now fetched dynamically on detail view
        };
    }));
};

/**
 * Get active campaigns with contact details for a device
 */
const getCampaignsForDevice = async (deviceId) => {
    const campaigns = await Campaign.find({ deviceId, status: 'active' });
    
    return await Promise.all(campaigns.map(async (c) => {
        const contacts = await CampaignContact.find({ campaignId: c.campaignId })
            .select('customerName mobileNumber region status -_id');

        return {
            id: c.campaignId,
            name: c.name,
            region: c.region,
            totalCount: c.totalCount,
            calledCount: c.calledCount,
            answeredCount: c.answeredCount,
            missedCount: c.missedCount,
            contacts
        };
    }));
};

/**
 * Handle campaign creation and contact import
 */
const createCampaign = async (data, fileBuffer) => {
    const { name, region, deviceId } = data;
    const exceljs = require('exceljs');
    
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.getWorksheet(1);

    const contacts = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const customerName = row.getCell(1).value?.toString() || 'Unknown';
        let mobileNumber = row.getCell(2).value?.toString().replace(/\D/g, '') || '';
        const contactRegion = row.getCell(3).value?.toString() || region;

        if (mobileNumber.length === 10) {
            contacts.push({ customerName, mobileNumber, region: contactRegion });
        }
    });

    if (contacts.length === 0) {
        throw new Error('No valid contacts found in file');
    }

    const campaign = new Campaign({
        name,
        region,
        deviceId,
        totalCount: contacts.length
    });

    await campaign.save();

    const campaignContacts = contacts.map(c => ({
        ...c,
        campaignId: campaign.campaignId
    }));

    await CampaignContact.insertMany(campaignContacts);
    return campaign;
};

/**
 * Enrich call logs with customer and order data
 * @param {Array} logs - Array of CallLog documents
 * @returns {Promise<Array>} - Array of enriched log objects
 */
const enrichCallLogs = async (logs) => {
    return await Promise.all(logs.map(async (log) => {
        let customerName = log.customerName;
        let outcome = log.outcome;
        let reminder = log.followUpDate;
        let totalBoxes = 0;
        let orderDetails = log.productQuantities && Object.keys(log.productQuantities).length > 0
            ? Object.entries(log.productQuantities).map(([p, q]) => {
                const qty = parseInt(q) || 0;
                totalBoxes += qty;
                return `${p} (x${qty})`;
            }).join(', ')
            : null;
        let distributor = log.distributor;

        if (!outcome || outcome === 'No Interaction') {
            const latestOrder = await Order.findOne({ mobileNo: log.phoneNumber }).sort({ createdAt: -1 });
            if (latestOrder) {
                customerName = customerName || latestOrder.customerName;
                outcome = outcome === 'No Interaction' ? latestOrder.orderStatus : outcome;
                reminder = reminder || latestOrder.tentativeRepeatDate;
                if (!orderDetails && latestOrder.products) {
                    orderDetails = latestOrder.products.map(p => {
                        const qty = parseInt(p.quantity) || 0;
                        totalBoxes += qty;
                        return `${p.productName} (x${qty})`;
                    }).join(', ');
                }
            }
        }

        return {
            timestamp: log.timestamp || log.createdAt,
            phoneNumber: log.phoneNumber || 'Unknown',
            callStatus: log.callStatus || 'Unknown',
            duration: formatDuration(log.duration),
            customerName: customerName || '-',
            outcome: outcome || 'No Interaction',
            totalBoxes,
            reminder: reminder || null,
            remarks: log.remarks || '',
            orderDetails: orderDetails || 'N/A',
            distributor: distributor || '-',
            recordingUrl: log.recordingUrl
        };
    }));
};

module.exports = {
    formatDuration,
    fetchDevicesWithStats,
    syncCallLog,
    syncCallOutcome,
    getCampaignsForDevice,
    createCampaign,
    enrichCallLogs
};
