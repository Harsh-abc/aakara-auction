import { lacksDashboardMfa, MFA_REQUIRED } from '../libs/dashboardMfa.js';

// every route behind requireRole is a dashboard route, so a dashboard role needs a login
// that entered its authenticator code (libs/dashboardMfa.js) — the app sends them to /authenticator
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Your Not Allowed To do the actions' });
        }
        if (lacksDashboardMfa(req.user)) {
            return res.status(403).json({
                success: false,
                code: MFA_REQUIRED,
                message: 'Enter the code from your authenticator app to use the dashboard',
            });
        }
        next();
    };
}

export function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const hasAll = requiredPermissions.every((p) => req.user.permissions.includes(p));
        if (!hasAll) {
            return res.status(403).json({ error: 'Forbidden: missing permission' });
        }
        next();
    };
}
