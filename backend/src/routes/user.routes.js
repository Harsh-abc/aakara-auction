import { Router } from 'express';
import { getAllUsers, getUserById } from '../controllers/user.controller.js';

const userRouter = Router();

// GET ALL USERS (admin only)
userRouter.get('/get-all-users', getAllUsers);

userRouter.get('/:uuid', getUserById);

export default userRouter;