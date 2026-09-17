import express from 'express'
import { createAuction } from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';


const auctionRouter = express.Router()

auctionRouter.post('/create-auction', authenticate, requireRole("SUPER_ADMIN", "ADMIN", "STAFF"), createAuction)


export default auctionRouter;