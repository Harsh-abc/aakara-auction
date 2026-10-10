"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"

import { useAppSelector } from "@/hooks/redux"
import { getSocket, setSocketToken } from "@/lib/socket"
import type { LiveAuctionStatus, LiveLotUpdate, OutbidNotice, StaffBidEvent } from "@/lib/types/bidding.types"

type ChannelHandlers = {
    onLotUpdate?: (update: LiveLotUpdate) => void
    onAuctionStatus?: (update: LiveAuctionStatus) => void
    /** this user lost the lead on a lot (any sale) */
    onOutbid?: (notice: OutbidNotice) => void
    /** staff channel only: every new bid with the bidder's name */
    onStaffBid?: (event: StaffBidEvent) => void
    /** after a reconnect — anything missed while offline should be refetched */
    onReconnect?: () => void
}

const subscribeConnection = (onChange: () => void) => {
    const socket = getSocket()
    socket.on("connect", onChange)
    socket.on("disconnect", onChange)
    return () => {
        socket.off("connect", onChange)
        socket.off("disconnect", onChange)
    }
}

/**
 * Live updates for one auction. `staff` joins the dashboard room (bidder names);
 * the server refuses it for non-staff. Returns whether the socket is connected,
 * so callers can fall back to polling while it isn't.
 */
export function useAuctionChannel(auctionUuid: string | null | undefined, handlers: ChannelHandlers, { staff = false } = {}) {
    const token = useAppSelector((state) => state.auth.accessToken)

    // latest handlers without re-subscribing on every render
    const handlersRef = useRef(handlers)
    useEffect(() => {
        handlersRef.current = handlers
    })

    useEffect(() => {
        setSocketToken(token)
    }, [token])

    const connected = useSyncExternalStore(
        subscribeConnection,
        () => getSocket().connected,
        () => false
    )

    useEffect(() => {
        if (!auctionUuid) return
        const socket = getSocket()
        const [joinEvent, leaveEvent] = staff ? ["staff:join", "staff:leave"] : ["auction:join", "auction:leave"]

        let joinedBefore = false
        const join = () => {
            socket.emit(joinEvent, { auctionUuid })
            if (joinedBefore) handlersRef.current.onReconnect?.()
            joinedBefore = true
        }

        const ours = <T extends { auctionUuid: string }>(fn: (payload: T) => void) => (payload: T) => {
            if (payload?.auctionUuid === auctionUuid) fn(payload)
        }
        const onLot = ours<LiveLotUpdate>((update) => handlersRef.current.onLotUpdate?.(update))
        const onStatus = ours<LiveAuctionStatus>((update) => handlersRef.current.onAuctionStatus?.(update))
        const onStaff = ours<StaffBidEvent>((event) => handlersRef.current.onStaffBid?.(event))
        const onOutbid = (notice: OutbidNotice) => handlersRef.current.onOutbid?.(notice)

        socket.on("connect", join)
        socket.on("lot:update", onLot)
        socket.on("auction:status", onStatus)
        socket.on("bid:outbid", onOutbid)
        if (staff) socket.on("bid:new", onStaff)
        if (socket.connected) join()

        return () => {
            socket.emit(leaveEvent, { auctionUuid })
            socket.off("connect", join)
            socket.off("lot:update", onLot)
            socket.off("auction:status", onStatus)
            socket.off("bid:outbid", onOutbid)
            socket.off("bid:new", onStaff)
        }
    }, [auctionUuid, staff])

    return connected
}
