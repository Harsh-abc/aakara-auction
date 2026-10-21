import express from "express";

import {
    executeProxies,
    getAuctionActivity,
    getAuctionConsole,
    getMyLotStanding,
    placeBid,
    placeFloorBid,
    setProxyBid,
} from "../controllers/bidding.controller.js";
import { exportProxyBids, getLotProxies, getProxyBids, getProxyBidSummary } from "../controllers/proxyBid.controller.js";
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

// PROXY BIDS — every proxy left on a lot, with the bidder's IP and device (admins only)
// the dashboard's Proxy Bids page is for super admins and auctioneers (frontend lib/constants/dashboardAccess.ts)
const PROXY_AUDIT_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"];
biddingRouter.get("/proxy-bids", authenticate, requireRole(...PROXY_AUDIT_ROLES), getProxyBids);
biddingRouter.get("/proxy-bids/summary", authenticate, requireRole(...PROXY_AUDIT_ROLES), getProxyBidSummary);
biddingRouter.get("/proxy-bids/export", authenticate, requireRole(...PROXY_AUDIT_ROLES), exportProxyBids);
// one lot's proxies for bid history and the console (IP / device only for the roles above)
biddingRouter.get("/lots/:lotUuid/proxies", authenticate, requireRole(...STAFF_ROLES), getLotProxies);

// CONSOLE — staff watch the live lot; those who run the floor enter floor bids
// (selling it is POST /api/auction/lots/:lotUuid/hammer)
biddingRouter.get("/auctions/:auctionUuid/console", authenticate, requireRole(...STAFF_ROLES), getAuctionConsole);
biddingRouter.post("/lots/:lotUuid/floor-bids", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), placeFloorBid);
// hammer step 1: place the lot's proxy bids (then POST /api/auction/lots/:lotUuid/hammer sells)
biddingRouter.post("/lots/:lotUuid/execute-proxies", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), executeProxies);

export default biddingRouter;
