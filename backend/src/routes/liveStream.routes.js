import express from "express";

import { getBans, getHostToken, getOnAir, getViewerToken, getWatchAccess, removeViewer, unbanViewer } from "../controllers/liveStream.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { STAFF_ROLES } from "../libs/socket.js";

const liveStreamRouter = express.Router();

// who can go live and moderate viewers (mirrors who can start / stop lots)
const HOST_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"];

// DASHBOARD — navbar live indicator (before /:auctionUuid)
liveStreamRouter.get("/on-air", authenticate, requireRole(...STAFF_ROLES), getOnAir);

// VIEWERS — the live room and its stream are for eligible bidders (and staff) only.
// optionalAuthenticate so a guest gets a clear "sign in" answer rather than a bare 401
liveStreamRouter.get("/:auctionUuid/access", optionalAuthenticate, getWatchAccess);
liveStreamRouter.get("/:auctionUuid/token", optionalAuthenticate, getViewerToken);

// STUDIO — go live, and remove / ban viewers
liveStreamRouter.post("/:auctionUuid/host-token", authenticate, requireRole(...HOST_ROLES), getHostToken);
liveStreamRouter.post("/:auctionUuid/viewers/:identity/remove", authenticate, requireRole(...HOST_ROLES), removeViewer);
liveStreamRouter.get("/:auctionUuid/bans", authenticate, requireRole(...HOST_ROLES), getBans);
liveStreamRouter.delete("/:auctionUuid/bans/:identity", authenticate, requireRole(...HOST_ROLES), unbanViewer);

export default liveStreamRouter;
