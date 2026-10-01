import { Router } from 'express'
import { changeUserRole, createUserByAdmin } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const adminRouter = Router();


// CHANGE USER ROLE ROUTES
adminRouter.patch('/:uuid/role', authenticate, requireRole('SUPER_ADMIN'), changeUserRole)

// SUPERAMIND CAN CREATE USER 
adminRouter.post('/create-user', authenticate, requireRole('SUPER_ADMIN'), createUserByAdmin)

export default adminRouter;