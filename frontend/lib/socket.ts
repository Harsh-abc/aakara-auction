import { io, type Socket } from "socket.io-client"

import { SOCKET_URL } from "@/services/api"

// One Socket.IO connection per tab, shared by every live view.
// The access token is optional: guests can watch public sales; signed-in users also get
// outbid alerts, and staff can join the dashboard rooms.

let socket: Socket | null = null
let token: string | null = null
// the user the open connection was made as ("" = guest)
let connectedAs = ""

// the token's subject (user uuid), so a refreshed token for the same user doesn't reconnect
function subjectOf(value: string | null) {
    if (!value) return ""
    try {
        const payload = value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
        return String(JSON.parse(atob(payload)).sub ?? "")
    } catch {
        return ""
    }
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
