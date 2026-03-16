const Dispatch = require('../models/Dispatch');
const Production = require('../models/Production');
const Inward = require('../models/Inward');
const ExcelJS = require('exceljs');

/**
 * Generate At-a-Glance Summary Report Data
 * @param {string|Date} dateParam - The date to generate the report for
 */
const getAtAGlanceReportData = async (dateParam) => {
    let targetDate;
    if (dateParam) {
        const [yyyy, mm, dd] = dateParam.split('-').map(Number);
        targetDate = new Date(yyyy, mm - 1, dd);
    } else {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
    }
    
    targetDate.setHours(0, 0, 0, 0);

    const endTarget = new Date(targetDate);
    endTarget.setHours(23, 59, 59, 999);

    const dateStr = targetDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // ISO Date for the date picker value - using local date methods to avoid UTC shift
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;


    // 2. Dispatches
    const dispatches = await Dispatch.find({
        dispatchDate: { $gte: targetDate, $lte: endTarget }
    }).populate('productId');

    // 3. Production
    const productionRecords = await Production.find({
        createdAt: { $gte: targetDate, $lte: endTarget }
    }).populate({
        path: 'productId',
        populate: { path: 'components.productId' }
    });

    // 4. Inwards
    const inwards = await Inward.find({
        createdAt: { $gte: targetDate, $lte: endTarget }
    }).populate('productId');

    // Organize by Factory
    const factoryWiseData = {
        indapur: { production: [], dispatches: [], inwards: [] },
        shirapur: { production: [], dispatches: [] , inwards: [] }
    };

    const addToFactory = (item, type) => {
        if (!item) return;
        const factory = String(item.factory || 'indapur').toLowerCase().trim();
        if (factoryWiseData[factory]) {
            factoryWiseData[factory][type].push(item);
        } else {
            factoryWiseData.indapur[type].push(item);
        }
    };

    if (Array.isArray(productionRecords)) productionRecords.forEach(r => addToFactory(r, 'production'));
    if (Array.isArray(inwards)) inwards.forEach(i => addToFactory(i, 'inwards'));

    // Handle Dispatches with Aggregation
    const groupedDispatches = {}; 

    if (Array.isArray(dispatches)) {
        dispatches.forEach(d => {
            const factory = String(d.factory || 'indapur').toLowerCase().trim();
            if (!groupedDispatches[factory]) groupedDispatches[factory] = {};
            
            const receiverKey = d.receiverName || 'Unknown';
            if (!groupedDispatches[factory][receiverKey]) {
                groupedDispatches[factory][receiverKey] = {
                    receiverName: receiverKey,
                    products: [],
                    totalBoxes: 0
                };
            }

            groupedDispatches[factory][receiverKey].products.push({
                productName: d.productName,
                quantity: d.quantity
            });
            groupedDispatches[factory][receiverKey].totalBoxes += d.quantity;
        });

        // Map back to factoryWiseData
        Object.keys(groupedDispatches).forEach(f => {
            if (factoryWiseData[f]) {
                factoryWiseData[f].dispatches = Object.values(groupedDispatches[f]);
            }
        });
    }

    return {
        dateStr,
        isoDate,
        factoryWiseData
    };
};

/**
 * Generate Excel Workbook for Daily Sales Report
 * @param {Array} orders 
 */
const generateSalesReportExcel = async (orders) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Sales Report');

    worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Salesperson Name', key: 'salesperson', width: 20 },
        { header: 'Customer Name', key: 'customer', width: 25 },
        { header: 'Mobile No', key: 'mobile', width: 15 },
        { header: 'Product Name', key: 'product', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Rate', key: 'rate', width: 10 },
        { header: 'Total Amount', key: 'total', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC107' }
    };

    orders.forEach(order => {
        const d = new Date(order.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const orderDate = `${day}/${month}/${year}`;

        if (order.products && order.products.length > 0) {
            order.products.forEach(product => {
                worksheet.addRow({
                    date: orderDate,
                    salesperson: order.salespersonId ? order.salespersonId.fullName : 'Unknown',
                    customer: order.customerName,
                    mobile: order.mobileNo,
                    product: product.productName,
                    quantity: product.quantity,
                    rate: product.rate || 0,
                    total: (product.quantity || 0) * (product.rate || 0)
                });
            });
        } else {
            worksheet.addRow({
                date: orderDate,
                salesperson: order.salespersonId ? order.salespersonId.fullName : 'Unknown',
                customer: order.customerName,
                mobile: order.mobileNo,
                product: 'No Orders',
                quantity: 0,
                rate: 0,
                total: 0
            });
        }
    });

    return workbook;
};

module.exports = {
    getAtAGlanceReportData,
    generateSalesReportExcel
};
