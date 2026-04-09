/**
 * RBAC Middleware: Admin Role Verification
 * Standardizes the authorization protocol for high-privilege operations.
 */
module.exports = function(req, res, next) {
    // Expecting req.user to be populated by the auth middleware
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access Denied: Administrative privileges required for this operation.',
            code: 'FORBIDDEN_PRIVILEGE'
        });
    }
    next();
};
