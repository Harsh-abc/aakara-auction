import { Router } from 'express';
import { changeMyPassword, getAllUsers, getUserStats, getMyKyc, getMyProfile, getMyRegistrations, getUserById, requestKycDocuments, reviewUserKyc, setKycStatus, setUserActive, submitMyKyc, updateMyProfile, updateUserDetails, uploadUserKyc } from '../controllers/user.controller.js';
import { addToGallery, getMyGallery, removeFromGallery } from '../controllers/gallery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny, uploadAvatar, uploadMyKyc } from '../middleware/upload.middleware.js';
import { STAFF_ROLES } from '../libs/socket.js';

const userRouter = Router();


// USER PROFILE
userRouter.get('/me/profile', authenticate, getMyProfile);
userRouter.patch('/me/update-profile', authenticate, uploadAvatar, updateMyProfile);
userRouter.patch('/me/change-password', authenticate, changeMyPassword);
userRouter.get('/me/registrations', authenticate, getMyRegistrations);
userRouter.get('/me/kyc', authenticate, getMyKyc);
userRouter.post('/me/kyc', authenticate, uploadMyKyc, submitMyKyc);

// MY AUCTION GALLERY (lots saved from the storefront; signed-in users only)
userRouter.get('/me/gallery', authenticate, getMyGallery);
userRouter.post('/me/gallery/:lotUuid', authenticate, addToGallery);
userRouter.delete('/me/gallery/:lotUuid', authenticate, removeFromGallery);


// GET ALL USERS (dashboard roles only — contact details, DOB and last login IP)
userRouter.get('/get-all-users', authenticate, requireRole(...STAFF_ROLES), getAllUsers);

// counts for the users page cards (before /:uuid so "stats" isn't read as a uuid)
userRouter.get('/stats', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'AUCTIONEER'), getUserStats);

// includes the user's KYC document links, so dashboard roles only
userRouter.get('/:uuid', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'AUCTIONEER'), getUserById);

// name, date of birth and username
userRouter.patch('/:uuid/details', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'), updateUserDetails)

// active / inactive (new signups start inactive and can't register for auctions or bid)
userRouter.patch('/:uuid/active', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'), setUserActive)

userRouter.post('/:uuid/kyc', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'), uploadAny, uploadUserKyc)

// approve / reject documents the user submitted from My profile
userRouter.patch('/:uuid/kyc/review', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'), reviewUserKyc)

// mark KYC verified / not verified by hand, whatever the documents say
userRouter.patch('/:uuid/kyc/status', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'), setKycStatus)

// ask the user to upload specific documents (emails them; shown on their KYC tab)
userRouter.post('/:uuid/kyc/request', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), requestKycDocuments)

export default userRouter;