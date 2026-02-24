const express = require('express');
const router = express.Router();
const factoryInchargeController = require('../controllers/factoryInchargeController');

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

router.get('/dashboard', factoryInchargeController.getDashboard);
router.get('/inward', factoryInchargeController.getInwardList);
router.get('/inward/new', factoryInchargeController.getInwardForm);
router.post('/inward', factoryInchargeController.createInward);

router.get('/dispatch', factoryInchargeController.getDispatchList);
router.get('/dispatch/new', factoryInchargeController.getDispatchForm);
router.post('/dispatch', factoryInchargeController.createDispatch);

module.exports = router;
