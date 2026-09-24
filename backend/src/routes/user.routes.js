import { Router } from 'express';
import { getAllUsers, getUserById, uploadUserKyc } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny } from '../middleware/upload.middleware.js';

const userRouter = Router();

// GET ALL USERS (admin only)
userRouter.get('/get-all-users', getAllUsers);

userRouter.get('/:uuid', getUserById);

userRouter.post('/:uuid/kyc', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'STAFF'), uploadAny, uploadUserKyc)

export default userRouter;