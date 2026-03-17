const express = require('express');
const router = express.Router();
const headofficeController = require('../controllers/headofficeController');
const { isHeadOffice } = require('../middleware/auth');

// Apply Head Office role check to all routes
router.use(isHeadOffice);

router.get('/dashboard', headofficeController.getDashboard);
router.get('/stock/raw-materials', headofficeController.getRawMaterialStock);
router.get('/stock/finished-goods', headofficeController.getFinishedGoodsStock);
router.get('/production-history', headofficeController.getProductionHistory);
router.get('/ims', headofficeController.getIMS);
router.get('/report/yesterday', headofficeController.getYesterdayReport);
router.get('/download-report', headofficeController.downloadDailyReport);
router.get('/telecrm', headofficeController.getTeleCRM);
router.get('/telecrm/campaigns', headofficeController.getCampaigns);
router.get('/telecrm/export/:deviceId', headofficeController.exportTeleCRM);
router.post('/suppliers/create', headofficeController.createSupplier);
router.post('/customers/create', headofficeController.createCustomer);
router.post('/mrp/calculate', headofficeController.calculateMRP);
router.post('/mrp/assign', headofficeController.assignProductionPlan);
router.get('/challan/:dispatchId', headofficeController.renderChallan);

module.exports = router;
