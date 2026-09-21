import express from 'express'
import { createAuction, getAuction, getLotByAuctionIdController } from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import upload from '../middleware/upload.middleware.js'


const auctionRouter = express.Router()

auctionRouter.post('/create-auction', authenticate, requireRole("SUPER_ADMIN", "ADMIN", "STAFF"), upload.any(), createAuction)


auctionRouter.get('/getAuction', authenticate, getAuction)

auctionRouter.get('/getLots/:auctionUuid/lots', getLotByAuctionIdController)


export default auctionRouter;