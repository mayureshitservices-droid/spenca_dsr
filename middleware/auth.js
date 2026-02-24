// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }

    // For API requests, return 401 JSON instead of redirecting
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please login.'
        });
    }

    res.redirect('/login');
};

module.exports = { isAuthenticated };
