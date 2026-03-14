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
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please login.'
        });
    }

    res.redirect('/login');
};

/**
 * Generic role check middleware
 * @param {Array} allowedRoles 
 */
const hasRole = (allowedRoles) => {
    return (req, res, next) => {
        if (req.session.userId && allowedRoles.includes(req.session.userRole)) {
            return next();
        }

        const isApiRequest = req.originalUrl.toLowerCase().startsWith('/api/') ||
            (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
            req.headers['x-requested-with'] === 'XMLHttpRequest';

        if (isApiRequest) {
            return res.status(401).json({ error: `Unauthorized: ${allowedRoles.join('/')} access required` });
        }

        res.redirect('/login');
    };
};

const isHeadOffice = hasRole(['headoffice', 'sysadmin', 'owner']);
const isFactoryIncharge = hasRole(['factory_incharge', 'sysadmin', 'owner']);
const isSalesperson = hasRole(['salesperson', 'sysadmin', 'owner']);

module.exports = { 
    isAuthenticated,
    hasRole,
    isHeadOffice,
    isFactoryIncharge,
    isSalesperson
};
