import type { AuctionStatus, LotStatus } from "./auction.types";
import type { CreateUserPayload, Pagination } from "./user.types";

export type LotBidderStatus = "PENDING" | "VERIFIED";
export type LotBidderSource = "SELF_REGISTERED" | "ADDED_BY_ADMIN";

/** Must match FILTERS in backend/src/services/lotBidder.services.js */
export type LotBidderFilter = "all" | "verified" | "unverified" | "registered" | "created";

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

    /** Set when the user was created from the dashboard */
    createdBy: { username: string; role: string } | null;

    /** The user's row for THIS lot — null until they register or get verified */
    registration: {
        source: LotBidderSource;
        status: LotBidderStatus;
        registeredAt: string;
        verifiedAt: string | null;
        verifiedBy: string | null;
    } | null;
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
        summary: { eligible: number; verified: number; pendingRegistrations: number };
        pagination: Pagination;
    };
}

export interface VerifyLotBiddersParams {
    lotUuid: string;
    userUuids: string[];
    verified: boolean;
}

/** Same fields as "Add User" — the account is created and added to the lot */
export interface AddNewLotBidderParams extends CreateUserPayload {
    lotUuid: string;
}

export interface AddNewLotBidderResponse {
    success: boolean;
    message: string;
    data: { lotUuid: string; user: { uuid: string; username: string; email: string } };
}

export interface VerifyLotBiddersResponse {
    success: boolean;
    message: string;
    data: { lotUuid: string; verified: boolean; requested: number; changed: number };
}
