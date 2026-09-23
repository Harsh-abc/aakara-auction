import express from 'express'
import { createAuction, getAuction, getLotByAuctionIdController } from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny } from "../middleware/upload.middleware.js";


const auctionRouter = express.Router()

auctionRouter.post(
    "/create-auction",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN", "STAFF"),
    uploadAny, // upload.any() + JSON error responses for bad file type / size
    createAuction
);



auctionRouter.get('/getAuction', authenticate, getAuction)

auctionRouter.get('/getLots/:auctionUuid/lots', authenticate, getLotByAuctionIdController)


export default auctionRouter;