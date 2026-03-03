const express = require('express');
const router = express.Router();
const factoryInchargeController = require('../controllers/factoryInchargeController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if user is factory incharge
const isFactoryIncharge = (req, res, next) => {
    const allowedRoles = ['factory_incharge', 'sysadmin', 'owner'];
    if (req.session.userId && allowedRoles.includes(req.session.userRole)) {
        return next();
    }

    // Prevent redirects for API/JSON requests
    const isApiRequest = req.originalUrl.toLowerCase().startsWith('/api/') ||
        (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
        req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isApiRequest) {
        console.log(`[FactoryIncharge] Unauthorized API request to ${req.originalUrl} from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Factory Incharge access required' });
    }

    res.redirect('/login');
};

router.use(isFactoryIncharge);

// router.get('/dashboard', factoryInchargeController.getDashboard);
router.get('/stock/raw-materials', factoryInchargeController.getRawMaterialStock);
router.get('/stock/finished-goods', factoryInchargeController.getFinishedGoodsStock);
router.get('/inward', factoryInchargeController.getInwardList);
router.get('/inward/new', factoryInchargeController.getInwardForm);
router.post('/inward', upload.single('invoicePhoto'), factoryInchargeController.createInward);

router.get('/dispatch', factoryInchargeController.getDispatchList);
router.get('/dispatch/new', factoryInchargeController.getDispatchForm);
router.post('/dispatch', upload.single('invoicePhoto'), factoryInchargeController.createDispatch);

router.get('/production', factoryInchargeController.getProductionList);
router.get('/production/new', factoryInchargeController.getProductionForm);
router.post('/production', factoryInchargeController.createProduction);

module.exports = router;
