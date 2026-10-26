import { io, type Socket } from "socket.io-client"

import { readAccessToken } from "@/lib/accessToken"
import { SOCKET_URL } from "@/services/api"

// One Socket.IO connection per tab, shared by every live view.
// The access token is optional: guests can watch public sales; signed-in users also get
// outbid alerts, and staff can join the dashboard rooms.

let socket: Socket | null = null
let token: string | null = null
// the user the open connection was made as ("" = guest)
let connectedAs = ""

// who the token is for (user uuid) and the authenticator code it carries (staff rooms need one),
// so a refreshed token for the same user doesn't reconnect but entering a new code does
function subjectOf(value: string | null) {
    const claims = readAccessToken(value) as { sub?: string; mfaUntil?: number } | null
    return claims ? `${claims.sub ?? ""}|${claims.mfaUntil ?? ""}` : ""
}

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            // read on every (re)connect, so it always sends the latest token
            auth: (send) => {
                connectedAs = subjectOf(token)
                send({ token })
            },
        })
    }
    return socket
}

/** Keep the socket's identity in step with the signed-in user (login, logout, another account). */
export function setSocketToken(next: string | null) {
    token = next
    if (socket?.connected && subjectOf(next) !== connectedAs) {
        // rooms are rejoined by useAuctionChannel on "connect"
        socket.disconnect().connect()
    }
}
