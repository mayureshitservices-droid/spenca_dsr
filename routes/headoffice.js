const express = require('express');
const router = express.Router();
const headofficeController = require('../controllers/headofficeController');

// Middleware to check if user is headoffice
const isHeadOffice = (req, res, next) => {
    if (req.session.userId && req.session.userRole === 'headoffice') {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(isHeadOffice);

router.get('/dashboard', headofficeController.getDashboard);
router.get('/download-report', headofficeController.downloadDailyReport);
router.get('/telecrm', headofficeController.getTeleCRM);

module.exports = router;
