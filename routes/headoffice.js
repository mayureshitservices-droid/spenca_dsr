const express = require('express');
const router = express.Router();
const headofficeController = require('../controllers/headofficeController');

// Middleware to check if user is headoffice
const isHeadOffice = (req, res, next) => {
    const allowedRoles = ['headoffice', 'sysadmin', 'owner'];
    if (req.session.userId && allowedRoles.includes(req.session.userRole)) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(isHeadOffice);

router.get('/dashboard', headofficeController.getDashboard);
router.get('/download-report', headofficeController.downloadDailyReport);
router.get('/telecrm', headofficeController.getTeleCRM);
router.get('/telecrm/export/:deviceId', headofficeController.exportTeleCRM);

module.exports = router;
