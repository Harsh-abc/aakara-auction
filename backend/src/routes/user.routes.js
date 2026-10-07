import { Router } from 'express';
import { changeMyPassword, getAllUsers, getMyKyc, getMyProfile, getMyRegistrations, getUserById, requestKycDocuments, reviewUserKyc, submitMyKyc, updateMyProfile, uploadUserKyc } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny } from '../middleware/upload.middleware.js';

const userRouter = Router();


// USER PROFILE
userRouter.get('/me/profile', authenticate, getMyProfile);
userRouter.patch('/me/update-profile', authenticate, uploadAny, updateMyProfile);
userRouter.patch('/me/change-password', authenticate, changeMyPassword);
userRouter.get('/me/registrations', authenticate, getMyRegistrations);
userRouter.get('/me/kyc', authenticate, getMyKyc);
userRouter.post('/me/kyc', authenticate, uploadAny, submitMyKyc);


// GET ALL USERS (admin only)
userRouter.get('/get-all-users', getAllUsers);

// includes the user's KYC document links, so dashboard roles only
userRouter.get('/:uuid', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'STAFF', 'AUCTIONEER'), getUserById);

userRouter.post('/:uuid/kyc', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'STAFF'), uploadAny, uploadUserKyc)

// approve / reject documents the user submitted from My profile
userRouter.patch('/:uuid/kyc/review', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'STAFF'), reviewUserKyc)

// ask the user to upload specific documents (emails them; shown on their KYC tab)
userRouter.post('/:uuid/kyc/request', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), requestKycDocuments)

export default userRouter;