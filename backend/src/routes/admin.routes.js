import { Router } from 'express'
import { changeUserRole, changeUserStatus, createUserByAdmin } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { exportActivityLogs, getActivityLogs, getActivityLogSummary } from '../controllers/activityLog.controller.js';

const adminRouter = Router();


// CHANGE USER ROLE ROUTES
adminRouter.patch('/:uuid/role', authenticate, requireRole('SUPER_ADMIN'), changeUserRole)

// SUSPEND / REACTIVATE A USER
adminRouter.patch('/:uuid/status', authenticate, requireRole('SUPER_ADMIN'), changeUserStatus)

// SUPERAMIND CAN CREATE USER
adminRouter.post('/create-user', authenticate, requireRole('SUPER_ADMIN'), createUserByAdmin)

// ACTIVITY LOGS — who did what, from which IP (super admin only)
adminRouter.get('/activity-logs', authenticate, requireRole('SUPER_ADMIN'), getActivityLogs)
adminRouter.get('/activity-logs/summary', authenticate, requireRole('SUPER_ADMIN'), getActivityLogSummary)
adminRouter.get('/activity-logs/export', authenticate, requireRole('SUPER_ADMIN'), exportActivityLogs)

export default adminRouter;