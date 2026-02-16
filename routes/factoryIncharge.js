const express = require('express');
const router = express.Router();
const factoryInchargeController = require('../controllers/factoryInchargeController');

// Middleware to check if user is factory incharge
const isFactoryIncharge = (req, res, next) => {
    const allowedRoles = ['factory_incharge', 'sysadmin', 'owner'];
    if (req.session.userId && allowedRoles.includes(req.session.userRole)) {
        next();
    } else {
        res.redirect('/login');
    }
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
