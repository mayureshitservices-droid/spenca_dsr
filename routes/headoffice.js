const express = require('express');
const router = express.Router();
const headofficeController = require('../controllers/headofficeController');

// Middleware to check if user is headoffice
const isHeadOffice = (req, res, next) => {
    const allowedRoles = ['headoffice', 'sysadmin', 'owner'];
    if (req.session.userId && allowedRoles.includes(req.session.userRole)) {
        return next();
    }

    // Prevent redirects for API/JSON requests
    const isApiRequest = req.originalUrl.toLowerCase().startsWith('/api/') ||
        (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
        req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isApiRequest) {
        console.log(`[HeadOffice] Unauthorized API request to ${req.originalUrl} from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Head Office access required' });
    }

    res.redirect('/login');
};

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

module.exports = router;
