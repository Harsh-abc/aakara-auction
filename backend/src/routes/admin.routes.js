import { Router } from 'express'
import { changeUserRole, changeUserStatus, createUserByAdmin, resetUserMfa, setUserBiddingLimit, setUserLotsVerified, setUserPhoneBidder } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { exportActivityLogs, getActivityLogs, getActivityLogSummary } from '../controllers/activityLog.controller.js';
import { getIpBlocks, unblockAllIps, unblockIp } from '../controllers/ipBlock.controller.js';
import { getOtpLimits, resetAllOtpLimits, resetOtpLimit } from '../controllers/otpLimit.controller.js';
import { getAdminAddedBidders } from '../controllers/auctionParticipant.controller.js';
import { getNotificationSettings, updateNotificationSetting } from '../controllers/notificationSetting.controller.js';
import {
    addLiveViewers,
    getLiveAccessAuctions,
    getLiveViewerCandidates,
    getLiveViewers,
    removeLiveViewer,
    setLiveAccessRestricted,
} from '../controllers/liveAccess.controller.js';

const adminRouter = Router();


// CHANGE USER ROLE ROUTES
adminRouter.patch('/:uuid/role', authenticate, requireRole('SUPER_ADMIN'), changeUserRole)

// SUSPEND / REACTIVATE A USER
adminRouter.patch('/:uuid/status', authenticate, requireRole('SUPER_ADMIN'), changeUserStatus)

// VERIFY / UNVERIFY A BIDDER ON ALL THEIR LOTS
adminRouter.patch('/:uuid/lots-verified', authenticate, requireRole('SUPER_ADMIN'), setUserLotsVerified)
adminRouter.patch('/:uuid/bidding-limit', authenticate, requireRole('SUPER_ADMIN'), setUserBiddingLimit)
// MARK / UNMARK A PHONE BIDDER (purple paddles on the Bidders page)
adminRouter.patch('/:uuid/phone-bidder', authenticate, requireRole('SUPER_ADMIN'), setUserPhoneBidder)

// RESET A USER'S GOOGLE AUTHENTICATOR (lost / new phone)
adminRouter.delete('/:uuid/mfa', authenticate, requireRole('SUPER_ADMIN'), resetUserMfa)

// SUPERAMIND CAN CREATE USER
adminRouter.post('/create-user', authenticate, requireRole('SUPER_ADMIN'), createUserByAdmin)

// BIDDERS ADDED BY A SUPER ADMIN — with their auctions / paddles, to register them for an auction
adminRouter.get('/added-bidders', authenticate, requireRole('SUPER_ADMIN'), getAdminAddedBidders)

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

// NOTIFICATIONS — on / off switches for user emails and SMS (super admin only)
adminRouter.get('/notification-settings', authenticate, requireRole('SUPER_ADMIN'), getNotificationSettings)
adminRouter.patch('/notification-settings', authenticate, requireRole('SUPER_ADMIN'), updateNotificationSetting)

// LIVE ACCESS — per auction: while live, only staff and the picked bidders see it (super admin only)
adminRouter.get('/live-access', authenticate, requireRole('SUPER_ADMIN'), getLiveAccessAuctions)
adminRouter.patch('/live-access/:auctionUuid', authenticate, requireRole('SUPER_ADMIN'), setLiveAccessRestricted)
adminRouter.get('/live-access/:auctionUuid/viewers', authenticate, requireRole('SUPER_ADMIN'), getLiveViewers)
adminRouter.get('/live-access/:auctionUuid/candidates', authenticate, requireRole('SUPER_ADMIN'), getLiveViewerCandidates)
adminRouter.post('/live-access/:auctionUuid/viewers', authenticate, requireRole('SUPER_ADMIN'), addLiveViewers)
adminRouter.delete('/live-access/:auctionUuid/viewers/:userUuid', authenticate, requireRole('SUPER_ADMIN'), removeLiveViewer)

export default adminRouter;