import type { AuctionStatus, AuctionType, AuctionVisibility, LotStatus } from "./auction.types";
import type { LotBidderSource, LotBidderStatus } from "./lotBidder.types";
import type { CreateUserPayload, Pagination } from "./user.types";

/** Must match PARTICIPANT_FILTERS in backend/src/services/auctionParticipant.services.js */
export type ParticipantFilter = "all" | "awaiting" | "self" | "admin";

export interface ParticipantUser {
    uuid: string;
    username: string;
    email: string;
    phone: string | null;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    kycStatus: string;
}

export interface AuctionParticipant extends ParticipantUser {
    /** Unique within the auction, assigned at registration and never reused */
    paddleNumber: string;
    source: LotBidderSource;
    registeredAt: string;
    /** Registration approval — on add by a super admin, or when first verified on a lot */
    status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED";
    approvedAt: string | null;
    approvedBy: string | null;
    /** Only lots the user has a row on — a missing lot means not registered for it */
    lots: { lotUuid: string; status: LotBidderStatus }[];
}

export interface ParticipantLot {
    uuid: string;
    itemNumber: string;
    title: string;
    artistName: string | null;
    status: LotStatus;
    scheduledStartAt: string;
    scheduledEndAt: string;
    imageUrl: string | null;
    /** Everyone registered for the auction has a row on every lot */
    bidders: { registered: number; verified: number; pending: number };
}

export interface ParticipantAuction {
    uuid: string;
    title: string;
    status: AuctionStatus;
    auctionType: AuctionType;
    visibility: AuctionVisibility;
    coverImageUrl: string | null;
    startTime: string;
    endTime: string;
    registrationRequired: boolean;
    registrationStarts: string | null;
    registrationDeadline: string | null;
}

export interface GetAuctionParticipantsParams {
    auctionUuid: string;
    page?: number;
    limit?: number;
    search?: string;
    filter?: ParticipantFilter;
}

export interface GetAuctionParticipantsResponse {
    success: boolean;
    message: string;
    data: {
        auction: ParticipantAuction;
        lots: ParticipantLot[];
        participants: AuctionParticipant[];
        summary: { total: number; selfRegistered: number; addedByAdmin: number; awaiting: number };
        pagination: Pagination;
    };
}

export interface GetParticipantCandidatesResponse {
    success: boolean;
    message: string;
    data: ParticipantUser[];
}

export interface ParticipantUuidsParams {
    auctionUuid: string;
    userUuids: string[];
}

export interface VerifyParticipantsParams extends ParticipantUuidsParams {
    verified: boolean;
}

/** Same fields as "Add User" — the account is created and registered for the auction */
export interface AddNewParticipantParams extends CreateUserPayload {
    auctionUuid: string;
}

/** Add / remove / verify all reply with a message plus counts */
export interface ParticipantActionResponse {
    success: boolean;
    message: string;
}
