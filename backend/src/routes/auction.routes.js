import express from 'express'
import { changeAuctionStatus, createAuction, deleteAuction, deleteLot, getAuction, getLotByAuctionIdController, updateAuction } from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadAny } from "../middleware/upload.middleware.js";
import { getLotBidders, getLotSummary, verifyLotBidders } from '../controllers/lotBidder.controller.js';
import { getAuctionStats, getAuctionTimeline, getLiveAuctions, hammerLot, setLotLive } from '../controllers/liveAuction.controller.js';
import {
    getAuctionBidHistory,
    getBidHistoryAuctions,
    getDashboardCalendar,
    getDashboardOverview,
    getLotBidHistory,
} from '../controllers/dashboard.controller.js';
import {
    addAuctionParticipants,
    addNewUserToAuction,
    getAuctionParticipants,
    getParticipantCandidates,
    registerForAuction,
    removeAuctionParticipants,
    verifyAuctionParticipants,
} from '../controllers/auctionParticipant.controller.js';
import { getFeaturedAuction, getPublicAuction, getPublicAuctions, getPublicLot, getPublicLots } from '../controllers/publicAuction.controller.js';
import { STAFF_ROLES } from '../libs/socket.js';
import { getArtwork, getArtworks, getArtworkSummary } from '../controllers/artwork.controller.js';


const auctionRouter = express.Router()

// STOREFRONT — no login; only published, non-invite-only sales
auctionRouter.get('/public', getPublicAuctions)
auctionRouter.get('/public/featured', getFeaturedAuction) // before /public/:auctionUuid
auctionRouter.get('/public/:auctionUuid', getPublicAuction)
auctionRouter.get('/public/:auctionUuid/lots', getPublicLots)
auctionRouter.get('/public/:auctionUuid/lots/:lotUuid', getPublicLot)

auctionRouter.post(
    "/create-auction",
    authenticate,
    requireRole("SUPER_ADMIN", "ADMIN", "OPERATIONS"),
    uploadAny, // upload.any() + JSON error responses for bad file type / size
    createAuction
);



// DASHBOARD — every auction (drafts, invite-only) and every lot with its reserve price and
// leading bidder, so dashboard roles only; bidders use the /public routes above
auctionRouter.get('/getAuction', authenticate, requireRole(...STAFF_ROLES), getAuction)

auctionRouter.get('/getLots/:auctionUuid/lots', authenticate, requireRole(...STAFF_ROLES), getLotByAuctionIdController)

auctionRouter.delete('/delete-auction/:auctionUuid', authenticate, requireRole("SUPER_ADMIN", "ADMIN"), deleteAuction)

// Delete one lot (auction draft / scheduled, lot without bids)
auctionRouter.delete('/lots/:lotUuid', authenticate, requireRole("SUPER_ADMIN", "ADMIN"), deleteLot)


auctionRouter.put("/update-auction/:auctionUuid", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), uploadAny, updateAuction);

// SUPER ADMIN CAN CHANGE THE AUCTION STATUS
auctionRouter.patch("/change-status/:auctionUuid", authenticate, requireRole("SUPER_ADMIN"), changeAuctionStatus);

// LOT BIDDERS — users registered via the auction; admins can view, only super admin can verify
auctionRouter.get("/lots/:lotUuid/summary", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), getLotSummary);
auctionRouter.get("/lots/:lotUuid/bidders", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), getLotBidders);
auctionRouter.patch("/lots/:lotUuid/bidders/verify", authenticate, requireRole("SUPER_ADMIN"), verifyLotBidders);

// LIVE FLOOR — live/paused auctions, and start/stop a lot (one live lot per auction)
auctionRouter.get("/live", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getLiveAuctions);

// DASHBOARD CARDS — auction counts by status
auctionRouter.get("/stats", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getAuctionStats);

// DASHBOARD HOME — overview panels, and the auction calendar (?month=YYYY-MM)
auctionRouter.get("/dashboard/overview", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getDashboardOverview);
auctionRouter.get("/dashboard/calendar", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getDashboardCalendar);

// DASHBOARD LOT BID HISTORY — sales, a sale's lots, and every bid / bidder on one lot
auctionRouter.get("/dashboard/bid-history", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getBidHistoryAuctions);
auctionRouter.get("/dashboard/bid-history/lots/:lotUuid", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getLotBidHistory);
auctionRouter.get("/dashboard/bid-history/:auctionUuid", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getAuctionBidHistory);

// ARTWORKS — every lot of every auction (catalogue, pricing incl. reserve, sale result)
auctionRouter.get("/artworks", authenticate, requireRole(...STAFF_ROLES), getArtworks);
auctionRouter.get("/artworks/summary", authenticate, requireRole(...STAFF_ROLES), getArtworkSummary); // before /artworks/:lotUuid
auctionRouter.get("/artworks/:lotUuid", authenticate, requireRole(...STAFF_ROLES), getArtwork);

// PAST / UPCOMING auctions (?type=past|upcoming)
auctionRouter.get("/timeline", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"), getAuctionTimeline);
auctionRouter.patch("/lots/:lotUuid/live", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), setLotLive);
// CONSOLE — sell the live lot to its leading bidder
auctionRouter.post("/lots/:lotUuid/hammer", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), hammerLot);

// AUCTION REGISTRATIONS — registering for an auction registers the user on every
// open lot (pending); the super admin then verifies them per lot or on all lots
auctionRouter.get("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN", "ADMIN", "AUCTIONEER"), getAuctionParticipants);
auctionRouter.get("/:auctionUuid/participants/candidates", authenticate, requireRole("SUPER_ADMIN"), getParticipantCandidates);
auctionRouter.post("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN"), addAuctionParticipants);
auctionRouter.post("/:auctionUuid/participants/new", authenticate, requireRole("SUPER_ADMIN"), addNewUserToAuction);
auctionRouter.patch("/:auctionUuid/participants/verify", authenticate, requireRole("SUPER_ADMIN"), verifyAuctionParticipants);
auctionRouter.delete("/:auctionUuid/participants", authenticate, requireRole("SUPER_ADMIN"), removeAuctionParticipants);
// BIDDER registers for an auction (role checked in the service)
auctionRouter.post("/:auctionUuid/register", authenticate, registerForAuction);

export default auctionRouter;