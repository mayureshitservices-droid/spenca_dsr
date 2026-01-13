const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Login routes
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Logout route
router.get('/logout', authController.logout);

// Root redirect
router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        const routes = {
            'sysadmin': '/sysadmin/dashboard',
            'sales_head': '/sales-head/dashboard',
            'owner': '/owner/dashboard',
            'salesperson': '/salesperson/dashboard',
            'headoffice': '/headoffice/dashboard'
        };
        return res.redirect(routes[req.session.userRole] || '/login');
    }
    res.redirect('/login');
});

module.exports = router;
