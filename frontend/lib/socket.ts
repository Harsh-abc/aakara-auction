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

const VISITOR_KEY = "akara.visitor"
let visitor: string | null = null

// a v4 uuid — crypto.randomUUID only exists on https / localhost
function newUuid() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// this browser's guest id — kept in localStorage, so every tab sends the same one and a guest's
// tabs count as one viewer of a live sale (signed-in viewers are counted by their account)
function visitorId() {
    if (visitor) return visitor
    try {
        visitor = window.localStorage.getItem(VISITOR_KEY)
        if (!visitor) {
            visitor = newUuid()
            window.localStorage.setItem(VISITOR_KEY, visitor)
        }
    } catch {
        // storage blocked (private mode): this tab counts on its own
        visitor ??= newUuid()
    }
    return visitor
}

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            // read on every (re)connect, so it always sends the latest token
            auth: (send) => {
                connectedAs = subjectOf(token)
                send({ token, visitor: visitorId() })
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
