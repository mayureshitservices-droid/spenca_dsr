// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }

    // Robust check for API/JSON requests to prevent redirects for apps/AJAX
    const isApiRequest = req.originalUrl.toLowerCase().startsWith('/api/') ||
        (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
        req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isApiRequest) {
        console.log(`[Auth] Unauthorized API request to ${req.originalUrl} from ${req.ip}`);
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please login.'
        });
    }

    res.redirect('/login');
};

module.exports = { isAuthenticated };
