const Product = require('../models/Product');
const Inward = require('../models/Inward');
const Dispatch = require('../models/Dispatch');
const Production = require('../models/Production');
const ProductionPlan = require('../models/ProductionPlan');

/**
 * Fetch stock for Raw Materials or Finished Goods
 * @param {string} type - 'Raw Material' or 'Finished Good'
 * @param {string} factory - Optional factory filter
 */
const getStock = async (type, factory = null) => {
    const products = await Product.find({ productType: type }).sort({ productName: 1 });
    
    if (factory) {
        return products.map(p => {
            const stock = (p.factoryStock && p.factoryStock[factory]) || 0;
            return {
                ...p.toObject(),
                factoryStockValue: stock
            };
        });
    }
    return products;
};

/**
 * Fetch transaction history for Inward, Dispatch, or Production
 * @param {string} modelName - 'Inward', 'Dispatch', or 'Production'
 * @param {object} query - filter query
 * @param {number} limit - max records
 */
const getTransactions = async (modelName, query = {}, limit = 100) => {
    let model;
    let populateField = 'productId';
    let sortField = 'createdAt';

    switch (modelName) {
        case 'Inward':
            model = Inward;
            break;
        case 'Dispatch':
            model = Dispatch;
            sortField = 'dispatchDate'; // Special case for dispatch
            break;
        case 'Production':
            model = Production;
            break;
        default:
            throw new Error('Invalid model name');
    }

    return await model.find(query)
        .populate(populateField)
        .sort({ [sortField]: -1 })
        .limit(limit);
};

/**
 * Calculate Material Requirements Planning (MRP)
 * @param {Array} items - [{ productId, quantity }]
 * @param {string} factory - Factory name
 */
const calculateMRP = async (items, factory) => {
    const requirements = {}; // Map of RM ID -> { name, needed, uom }
    const fgStockInfo = [];

    for (const item of items) {
        const product = await Product.findById(item.productId).populate('components.productId');
        if (!product || !product.components) continue;

        const targetQty = parseFloat(item.quantity) || 0;
        const unitsPerBox = parseFloat(product.packaging) || 1;
        const totalUnits = targetQty * unitsPerBox;

        fgStockInfo.push({
            name: product.productName,
            packaging: product.packaging || 'N/A',
            targetQty: targetQty,
            availableQty: (product.factoryStock && product.factoryStock[factory]) ? product.factoryStock[factory].toFixed(0) : 0
        });

        product.components.forEach(comp => {
            if (!comp.productId) return;
            const rmId = comp.productId._id.toString();
            if (!requirements[rmId]) {
                requirements[rmId] = {
                    name: comp.productName || comp.productId.productName,
                    needed: 0,
                    uom: comp.uom || comp.productId.uom
                };
            }
            requirements[rmId].needed += (comp.quantity * totalUnits);
        });
    }

    const results = [];
    for (const rmId in requirements) {
        const rm = await Product.findById(rmId);
        const reqData = requirements[rmId];
        const stock = (rm.factoryStock && rm.factoryStock[factory]) ? rm.factoryStock[factory] : 0;
        const balance = stock - reqData.needed;
        
        results.push({
            name: reqData.name,
            requiredQty: reqData.needed.toFixed(2),
            uom: reqData.uom,
            availableQty: stock.toFixed(2),
            balance: balance.toFixed(2),
            status: balance >= 0 ? 'Excess' : 'Shortage'
        });
    }

    return {
        rawMaterials: results,
        finishedGoods: fgStockInfo
    };
};

/**
 * Fetch all production plans for a specific factory
 * @param {string} factory 
 */
const getProductionPlans = async (factory) => {
    return await ProductionPlan.find({ factory })
        .populate('assignedBy', 'fullName')
        .populate('targetFinishedGoods.product', 'productName packaging uom')
        .sort({ assignedDate: -1 });
};

module.exports = {
    getStock,
    getTransactions,
    calculateMRP,
    getProductionPlans
};
