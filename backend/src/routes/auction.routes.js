import express from 'express'
import { changeAuctionStatus, createAuction, deleteAuction, deleteLot, getAuction, getLotByAuctionIdController, updateAuction } from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny } from "../middleware/upload.middleware.js";
import { getLotBidders, getLotSummary, verifyLotBidders } from '../controllers/lotBidder.controller.js';
import { getAuctionTimeline, getLiveAuctions, setLotLive } from '../controllers/liveAuction.controller.js';
import {
    addAuctionParticipants,
    addNewUserToAuction,
    getAuctionParticipants,
    getParticipantCandidates,
    registerForAuction,
    removeAuctionParticipants,
    verifyAuctionParticipants,
} from '../controllers/auctionParticipant.controller.js';
import { getFeaturedAuction, getPublicAuction, getPublicAuctions, getPublicLots } from '../controllers/publicAuction.controller.js';


const auctionRouter = express.Router()

// STOREFRONT — no login; only published, non-invite-only sales
auctionRouter.get('/public', getPublicAuctions)
auctionRouter.get('/public/featured', getFeaturedAuction) // before /public/:auctionUuid
auctionRouter.get('/public/:auctionUuid', getPublicAuction)
auctionRouter.get('/public/:auctionUuid/lots', getPublicLots)

auctionRouter.post(
    "/create-auction",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN", "STAFF"),
    uploadAny, // upload.any() + JSON error responses for bad file type / size
    createAuction
);



auctionRouter.get('/getAuction', authenticate, getAuction)

auctionRouter.get('/getLots/:auctionUuid/lots', authenticate, getLotByAuctionIdController)

auctionRouter.delete('/delete-auction/:auctionUuid', authenticate, requireRole("SUPER_ADMIN", "ADMIN"), deleteAuction)

// Delete one lot (auction draft / scheduled, lot without bids)
auctionRouter.delete('/lots/:lotUuid', authenticate, requireRole("SUPER_ADMIN", "ADMIN"), deleteLot)


auctionRouter.put("/update-auction/:auctionUuid", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), uploadAny, updateAuction);

// SUPER ADMIN CAN CHANGE THE AUCTION STATUS
auctionRouter.patch("/change-status/:auctionUuid", authenticate, requireRole("SUPER_ADMIN"), changeAuctionStatus);

// LOT BIDDERS — users registered via the auction; admins can view, only super admin can verify
auctionRouter.get("/lots/:lotUuid/summary", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), getLotSummary);
auctionRouter.get("/lots/:lotUuid/bidders", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), getLotBidders);
auctionRouter.patch("/lots/:lotUuid/bidders/verify", authenticate, requireRole("SUPER_ADMIN"), verifyLotBidders);

// LIVE FLOOR — live/paused auctions, and start/stop a lot (one live lot per auction)
auctionRouter.get("/live", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "STAFF"), getLiveAuctions);

// PAST / UPCOMING auctions (?type=past|upcoming)
auctionRouter.get("/timeline", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "STAFF"), getAuctionTimeline);
auctionRouter.patch("/lots/:lotUuid/live", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), setLotLive);

// AUCTION REGISTRATIONS — registering for an auction registers the user on every
// open lot (pending); the super admin then verifies them per lot or on all lots
auctionRouter.get("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), getAuctionParticipants);
auctionRouter.get("/:auctionUuid/participants/candidates", authenticate, requireRole("SUPER_ADMIN"), getParticipantCandidates);
auctionRouter.post("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN"), addAuctionParticipants);
auctionRouter.post("/:auctionUuid/participants/new", authenticate, requireRole("SUPER_ADMIN"), addNewUserToAuction);
auctionRouter.patch("/:auctionUuid/participants/verify", authenticate, requireRole("SUPER_ADMIN"), verifyAuctionParticipants);
auctionRouter.delete("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN"), removeAuctionParticipants);
// BIDDER registers for an auction (role checked in the service)
auctionRouter.post("/:auctionUuid/register", authenticate, registerForAuction);

export default auctionRouter;