import { Router } from 'express'
import { changeUserRole } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const adminRouter = Router();


// CHANGE USER ROLE ROUTES
adminRouter.patch('/:uuid/role', authenticate, requireRole('SUPER_ADMIN'), changeUserRole)

export default adminRouter;