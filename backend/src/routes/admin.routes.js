import { Router } from 'express'
import { changeUserRole, changeUserStatus, createUserByAdmin, resetUserMfa } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { exportActivityLogs, getActivityLogs, getActivityLogSummary } from '../controllers/activityLog.controller.js';
import { getIpBlocks, unblockAllIps, unblockIp } from '../controllers/ipBlock.controller.js';
import { getOtpLimits, resetAllOtpLimits, resetOtpLimit } from '../controllers/otpLimit.controller.js';

const adminRouter = Router();


// CHANGE USER ROLE ROUTES
adminRouter.patch('/:uuid/role', authenticate, requireRole('SUPER_ADMIN'), changeUserRole)

// SUSPEND / REACTIVATE A USER
adminRouter.patch('/:uuid/status', authenticate, requireRole('SUPER_ADMIN'), changeUserStatus)

// RESET A USER'S GOOGLE AUTHENTICATOR (lost / new phone)
adminRouter.delete('/:uuid/mfa', authenticate, requireRole('SUPER_ADMIN'), resetUserMfa)

// SUPERAMIND CAN CREATE USER
adminRouter.post('/create-user', authenticate, requireRole('SUPER_ADMIN'), createUserByAdmin)

// ACTIVITY LOGS — who did what, from which IP (super admin only)
adminRouter.get('/activity-logs', authenticate, requireRole('SUPER_ADMIN'), getActivityLogs)
adminRouter.get('/activity-logs/summary', authenticate, requireRole('SUPER_ADMIN'), getActivityLogSummary)
adminRouter.get('/activity-logs/export', authenticate, requireRole('SUPER_ADMIN'), exportActivityLogs)

// BLOCKED IPS — sign-in IP blocks in Redis (super admin only)
adminRouter.get('/ip-blocks', authenticate, requireRole('SUPER_ADMIN'), getIpBlocks)
adminRouter.delete('/ip-blocks', authenticate, requireRole('SUPER_ADMIN'), unblockAllIps)
adminRouter.delete('/ip-blocks/:ip', authenticate, requireRole('SUPER_ADMIN'), unblockIp)

// OTP LIMITS — sign-up OTP send counters in Redis (super admin only)
adminRouter.get('/otp-limits', authenticate, requireRole('SUPER_ADMIN'), getOtpLimits)
adminRouter.delete('/otp-limits', authenticate, requireRole('SUPER_ADMIN'), resetAllOtpLimits)
adminRouter.delete('/otp-limits/:kind/:subject', authenticate, requireRole('SUPER_ADMIN'), resetOtpLimit)

export default adminRouter;