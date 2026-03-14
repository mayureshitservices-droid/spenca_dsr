const Order = require('../models/Order');
const Dispatch = require('../models/Dispatch');
const Production = require('../models/Production');
const Inward = require('../models/Inward');
const ExcelJS = require('exceljs');

/**
 * Generate Yesterday's Summary Report Data
 */
const getYesterdayReportData = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endYesterday = new Date(yesterday);
    endYesterday.setHours(23, 59, 59, 999);

    const dateStr = yesterday.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // 1. Salesperson Wise Orders
    const orders = await Order.find({
        createdAt: { $gte: yesterday, $lte: endYesterday },
        orderStatus: 'Ordered'
    }).populate('salespersonId', 'fullName');

    const salespersonActivity = {};
    orders.forEach(order => {
        const name = order.salespersonId ? order.salespersonId.fullName : 'Direct/Other';
        if (!salespersonActivity[name]) {
            salespersonActivity[name] = { count: 0, totalAmount: 0 };
        }
        salespersonActivity[name].count++;
        const orderTotal = (order.products || []).reduce((sum, p) => sum + (p.quantity * (p.rate || 0)), 0);
        salespersonActivity[name].totalAmount += orderTotal;
    });

    // 2. Dispatches
    const dispatches = await Dispatch.find({
        dispatchDate: { $gte: yesterday, $lte: endYesterday }
    }).populate('productId');

    // 3. Production
    const productionRecords = await Production.find({
        createdAt: { $gte: yesterday, $lte: endYesterday }
    }).populate({
        path: 'productId',
        populate: { path: 'components.productId' }
    });

    // 4. Inwards
    const inwards = await Inward.find({
        createdAt: { $gte: yesterday, $lte: endYesterday }
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
    if (Array.isArray(dispatches)) dispatches.forEach(d => addToFactory(d, 'dispatches'));
    if (Array.isArray(inwards)) inwards.forEach(i => addToFactory(i, 'inwards'));

    return {
        dateStr,
        salespersonActivity,
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
    getYesterdayReportData,
    generateSalesReportExcel
};
