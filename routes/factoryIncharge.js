const express = require('express');
const router = express.Router();
const factoryInchargeController = require('../controllers/factoryInchargeController');
const { isFactoryIncharge } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Apply Factory Incharge role check to all routes
router.use(isFactoryIncharge);

router.get('/stock/raw-materials', factoryInchargeController.getRawMaterialStock);
router.get('/stock/finished-goods', factoryInchargeController.getFinishedGoodsStock);
router.get('/inward', factoryInchargeController.getInwardList);
router.get('/inward/new', factoryInchargeController.getInwardForm);
router.post('/inward', upload.single('invoicePhoto'), factoryInchargeController.createInward);
router.post('/suppliers', factoryInchargeController.createSupplier);

router.get('/dispatch', factoryInchargeController.getDispatchList);
router.get('/dispatch/new', factoryInchargeController.getDispatchForm);
router.post('/dispatch', upload.single('dcPhoto'), factoryInchargeController.createDispatch);
router.get('/challan/:dispatchId', factoryInchargeController.renderChallan);

router.get('/production', factoryInchargeController.getProductionList);
router.get('/production/new', factoryInchargeController.getProductionForm);
router.post('/production', factoryInchargeController.createProduction);

router.get('/production-plans', factoryInchargeController.getProductionPlans);

module.exports = router;
