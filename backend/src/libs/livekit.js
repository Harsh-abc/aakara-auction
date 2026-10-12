import { RoomServiceClient } from "livekit-server-sdk";

/**
 * LiveKit Cloud (live video of the auction floor).
 *   LIVEKIT_URL        wss://<project>.livekit.cloud
 *   LIVEKIT_API_KEY    / LIVEKIT_API_SECRET  → LiveKit Cloud → Settings → API Keys
 * One room per auction; the auctioneer publishes into it, everyone else watches.
 */
export const livekitConfig = () => {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
        const error = new Error("Live stream is not configured");
        error.statusCode = 503;
        throw error;
    }
    return { url, apiKey, apiSecret };
};

export const isLivekitConfigured = () =>
    Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);

const ROOM_PREFIX = "auction-";

export const liveRoomName = (auctionUuid) => `${ROOM_PREFIX}${auctionUuid}`;

export const auctionUuidFromRoom = (room) => (room?.startsWith(ROOM_PREFIX) ? room.slice(ROOM_PREFIX.length) : null);

// the studio joins as "host-<user uuid>"; viewers as "user-<uuid>" or "viewer-<browser id>"
export const HOST_PREFIX = "host-";

export const roomService = () => {
    const { url, apiKey, apiSecret } = livekitConfig();
    return new RoomServiceClient(url.replace(/^ws/, "http"), apiKey, apiSecret);
};
