const User = require('../models/User');

// GET /login
const getLogin = (req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session && req.session.userId) {
        return res.redirect(getDashboardRoute(req.session.userRole));
    }
    res.render('login', { error: null });
};

// POST /login
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.activeStatus) {
            return res.render('login', { error: 'Your account has been deactivated. Please contact administrator.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userRole = user.role;
        req.session.userName = user.fullName;

        // Redirect to role-based dashboard
        res.redirect(getDashboardRoute(user.role));

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred. Please try again.' });
    }
};

// GET /logout
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
};

// Helper function to get dashboard route based on role
const getDashboardRoute = (role) => {
    const routes = {
        'sysadmin': '/sysadmin/dashboard',
        'sales_head': '/sales-head/dashboard',
        'owner': '/owner/dashboard',
        'salesperson': '/salesperson/dashboard'
    };
    return routes[role] || '/login';
};

module.exports = {
    getLogin,
    postLogin,
    logout
};
