import type { AuctionStatus, LotStatus } from "./auction.types";
import type { Pagination } from "./user.types";

export type LotBidderStatus = "PENDING" | "VERIFIED";
export type LotBidderSource = "SELF_REGISTERED" | "ADDED_BY_ADMIN";

/** Must match FILTERS in backend/src/services/lotBidder.services.js */
export type LotBidderFilter = "all" | "verified" | "pending";

export interface LotSummary {
    uuid: string;
    itemNumber: string;
    title: string;
    artistName: string | null;
    medium: string | null;
    yearCreated: string | null;
    status: LotStatus;
    startingPrice: string;
    estimateLow: string | null;
    estimateHigh: string | null;
    scheduledStartAt: string;
    scheduledEndAt: string;
    currency: { code: string; symbol: string | null } | null;
    imageUrl: string | null;
    auction: { uuid: string; title: string; status: AuctionStatus };
}

export interface LotBidder {
    uuid: string;
    username: string;
    email: string;
    phone: string | null;
    createdAt: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    kycStatus: string;
    /** Their paddle for this lot's auction — null only for legacy rows without an auction registration */
    paddleNumber: string | null;

    /** The user's row for THIS lot — created when they registered for the auction */
    registration: {
        source: LotBidderSource;
        status: LotBidderStatus;
        registeredAt: string;
        verifiedAt: string | null;
        verifiedBy: string | null;
    };
}

export interface GetLotBiddersParams {
    lotUuid: string;
    page?: number;
    limit?: number;
    search?: string;
    filter?: LotBidderFilter;
}

export interface GetLotSummaryResponse {
    success: boolean;
    message: string;
    data: LotSummary;
}

export interface GetLotBiddersResponse {
    success: boolean;
    message: string;
    data: {
        bidders: LotBidder[];
        summary: { registered: number; verified: number; pending: number };
        pagination: Pagination;
    };
}

export interface VerifyLotBiddersParams {
    lotUuid: string;
    userUuids: string[];
    verified: boolean;
}

export interface VerifyLotBiddersResponse {
    success: boolean;
    message: string;
    data: { lotUuid: string; verified: boolean; requested: number; changed: number };
}
