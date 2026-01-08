// Middleware to check user role
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.userRole) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (allowedRoles.includes(req.session.userRole)) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    };
};

module.exports = { checkRole };
