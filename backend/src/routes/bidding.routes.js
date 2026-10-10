import express from "express";

import { getAuctionActivity, getMyLotStanding, placeBid, setProxyBid } from "../controllers/bidding.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { STAFF_ROLES } from "../libs/socket.js";

const biddingRouter = express.Router();

// BIDDERS — who may bid is checked in the service (verified on the lot)
biddingRouter.get("/lots/:lotUuid/me", authenticate, getMyLotStanding);
biddingRouter.post("/lots/:lotUuid/bids", authenticate, placeBid);
biddingRouter.post("/lots/:lotUuid/proxy", authenticate, setProxyBid);

// DASHBOARD — live bidding activity of a sale
biddingRouter.get("/auctions/:auctionUuid/activity", authenticate, requireRole(...STAFF_ROLES), getAuctionActivity);

export default biddingRouter;
