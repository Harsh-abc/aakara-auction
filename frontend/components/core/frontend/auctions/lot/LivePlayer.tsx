"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import axios from "axios"
import { AudioTrack, LiveKitRoom, VideoTrack, useTracks } from "@livekit/components-react"
import { DisconnectReason, Track } from "livekit-client"
import { Maximize2, Minimize2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppSelector } from "@/hooks/redux"
import { getSocket, setSocketToken } from "@/lib/socket"
import { getLiveStreamToken, type LiveStreamAccess } from "@/services/operations/liveStream.api"

// LiveKit bills every connected viewer by the minute, so the player only stays connected while it's watched.
// after a dropped connection or a failed token request
const RETRY_MS = 8_000
// waiting for the auctioneer to go live — the backend won't hand out a token for an empty room
const OFF_AIR_POLL_MS = 15_000
// a tab in the background this long leaves the room; it rejoins when shown again
const HIDDEN_DISCONNECT_MS = 2 * 60_000
// connected, but the auctioneer stopped publishing this long — leave and go back to waiting
const IDLE_DISCONNECT_MS = 60_000

type LivePlayerProps = {
    auctionUuid: string
    /** shown until the auctioneer's video arrives (the lot image) */
    fallback: ReactNode
    className?: string
}

// why the player isn't connecting: not allowed, removed, or playing in another tab / device
type Blocked = { kind: "denied" | "removed" | "elsewhere"; message: string }

/**
 * Watch-only WebRTC player (LiveKit, ~0.3 s behind the room). Eligible bidders (and staff) only.
 * Screen share fills the frame with the camera as picture-in-picture; otherwise the camera alone.
 */
export function LivePlayer({ auctionUuid, fallback, className }: LivePlayerProps) {
    const accessToken = useAppSelector((state) => state.auth.accessToken)
    const userUuid = useAppSelector((state) => state.auth.user?.uuid ?? null)
    // read at connect time only — a refreshed access token shouldn't drop the stream
    const accessTokenRef = useRef(accessToken)
    useEffect(() => {
        accessTokenRef.current = accessToken
    })

    const [access, setAccess] = useState<LiveStreamAccess | null>(null)
    const [blocked, setBlocked] = useState<Blocked | null>(null)
    // the tab has been in the background a while — out of the room until it's shown again
    const [hidden, setHidden] = useState(false)
    const [attempt, setAttempt] = useState(0)

    const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const retryIn = (ms: number) => {
        clearTimeout(retryRef.current)
        retryRef.current = setTimeout(() => setAttempt((n) => n + 1), ms)
    }
    useEffect(() => () => clearTimeout(retryRef.current), [])

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const onVisibility = () => {
            clearTimeout(timer)
            if (document.visibilityState === "visible") return setHidden(false)
            timer = setTimeout(() => {
                setHidden(true)
                setAccess(null)
            }, HIDDEN_DISCONNECT_MS)
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
            clearTimeout(timer)
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [])

    // signing in / out starts over
    const [blockedFor, setBlockedFor] = useState(userUuid)
    if (blockedFor !== userUuid) {
        setBlockedFor(userUuid)
        setBlocked(null)
    }

    // a new token on mount, on login / logout, after each retry, and when the tab comes back
    useEffect(() => {
        if (hidden || blocked) return
        if (!userUuid || !accessTokenRef.current) {
            setBlocked({ kind: "denied", message: "Sign in with your bidder account to watch the live auction." })
            return
        }
        let cancelled = false

        getLiveStreamToken(auctionUuid, accessTokenRef.current)
            .then((data) => !cancelled && setAccess(data))
            .catch((error) => {
                if (cancelled) return
                const response = axios.isAxiosError(error) ? error.response : undefined
                const status = response?.status
                const message: string = response?.data?.message ?? "You can't watch this live stream."
                if (response?.data?.code === "REMOVED") return setBlocked({ kind: "removed", message })
                // not signed in / not an eligible bidder for this sale
                if (status === 401 || status === 403) return setBlocked({ kind: "denied", message })
                // not configured / no such sale — stay on the lot image
                if (status === 503 || status === 404) return
                // the sale or the auctioneer isn't live yet — check back now and then
                retryIn(status === 409 ? OFF_AIR_POLL_MS : RETRY_MS)
            })

        return () => {
            cancelled = true
        }
    }, [auctionUuid, userUuid, attempt, hidden, blocked])

    // tell the studio who's in the live room while this page is open (the server checks eligibility);
    // leaving the page, closing the tab or being removed takes them off its Viewers list
    const listed = Boolean(userUuid) && blocked?.kind !== "removed" && blocked?.kind !== "denied"
    useEffect(() => {
        setSocketToken(accessToken)
    }, [accessToken])
    useEffect(() => {
        if (!listed) return
        const socket = getSocket()
        // rejoin after a reconnect (a new token for another user reconnects the socket too)
        const watch = () => socket.emit("live:watch", { auctionUuid })
        socket.on("connect", watch)
        if (socket.connected) watch()
        return () => {
            socket.off("connect", watch)
            socket.emit("live:unwatch", { auctionUuid })
        }
    }, [auctionUuid, listed])

    // the auctioneer removed this account from the stream — works off air too, when we aren't in LiveKit
    useEffect(() => {
        const socket = getSocket()
        const onRemoved = (payload: { auctionUuid?: string; message?: string }) => {
            if (payload?.auctionUuid !== auctionUuid) return
            clearTimeout(retryRef.current)
            setAccess(null)
            setBlocked({ kind: "removed", message: payload.message || "You have been removed from this live stream." })
        }
        socket.on("live:removed", onRemoved)
        return () => {
            socket.off("live:removed", onRemoved)
        }
    }, [auctionUuid])

    if (blocked) {
        return (
            <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#ebebeb] p-4 text-center text-[11px] text-[#717171]", className)}>
                <p>{blocked.message}</p>
                {blocked.kind === "elsewhere" && (
                    <button type="button" onClick={() => setBlocked(null)} className="bg-[#0d0d0d] px-3 py-1.5 text-[10px] tracking-[0.12em] text-white uppercase">
                        Watch here
                    </button>
                )}
            </div>
        )
    }

    if (hidden) return <>{fallback}</>

    if (!access) return <>{fallback}</>

    return (
        <LiveKitRoom
            serverUrl={access.url}
            token={access.token}
            connect
            audio={false}
            video={false}
            options={{ adaptiveStream: true, dynacast: true }}
            onDisconnected={(reason) => {
                if (reason === DisconnectReason.CLIENT_INITIATED) return
                setAccess(null)
                if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
                    return setBlocked({ kind: "removed", message: "You have been removed from this live stream." })
                }
                // the same account joined from another tab or device — don't fight it for the seat
                if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
                    return setBlocked({ kind: "elsewhere", message: "The live stream is playing in another tab or device." })
                }
                // room closed or network lost — fetch a fresh token and rejoin
                retryIn(RETRY_MS)
            }}
            className={cn("absolute inset-0", className)}
        >
            <Stage
                fallback={fallback}
                onIdle={() => {
                    // the auctioneer stopped publishing — don't pay for sitting in an empty room
                    setAccess(null)
                    retryIn(OFF_AIR_POLL_MS)
                }}
            />
        </LiveKitRoom>
    )
}

function Stage({ fallback, onIdle }: { fallback: ReactNode; onIdle: () => void }) {
    const boxRef = useRef<HTMLDivElement>(null)
    // browsers only autoplay muted — tap to unmute
    const [muted, setMuted] = useState(true)
    const [isFull, setIsFull] = useState(false)

    const videos = useTracks([Track.Source.ScreenShare, Track.Source.Camera], { onlySubscribed: true })
    const audios = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio], { onlySubscribed: true })

    const screen = videos.find((track) => track.source === Track.Source.ScreenShare)
    const camera = videos.find((track) => track.source === Track.Source.Camera)
    const main = screen ?? camera
    const pip = screen && camera ? camera : undefined

    // nothing published for a while → leave the room (the grace period also covers the first subscribe)
    const onAir = videos.length > 0 || audios.length > 0
    const onIdleRef = useRef(onIdle)
    useEffect(() => {
        onIdleRef.current = onIdle
    })
    useEffect(() => {
        if (onAir) return
        const timer = setTimeout(() => onIdleRef.current(), IDLE_DISCONNECT_MS)
        return () => clearTimeout(timer)
    }, [onAir])

    useEffect(() => {
        const onChange = () => setIsFull(document.fullscreenElement === boxRef.current)
        document.addEventListener("fullscreenchange", onChange)
        return () => document.removeEventListener("fullscreenchange", onChange)
    }, [])

    const toggleFullscreen = async () => {
        const box = boxRef.current
        if (!box) return
        if (document.fullscreenElement) return void document.exitFullscreen()
        if (box.requestFullscreen) {
            await box.requestFullscreen().catch(() => {})
            // landscape on phones that allow it
            const orientation = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
            orientation?.lock?.("landscape").catch(() => {})
            return
        }
        // iPhone Safari: only the <video> itself can go full screen
        const video = box.querySelector("video") as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
        video?.webkitEnterFullscreen?.()
    }

    return (
        <div ref={boxRef} onDoubleClick={main ? toggleFullscreen : undefined} className={cn("absolute inset-0", isFull ? "bg-black" : "bg-[#ebebeb]")}>
            {main ? (
                <VideoTrack
                    trackRef={main}
                    className={cn("absolute inset-0 h-full w-full bg-black", screen || isFull ? "object-contain" : "object-cover")}
                />
            ) : (
                fallback
            )}
            {pip && (
                <VideoTrack
                    trackRef={pip}
                    className="absolute bottom-3.5 left-3.5 z-2 aspect-video w-1/4 border-2 border-white bg-black object-cover shadow-md"
                />
            )}

            {audios.map((track) => (
                <AudioTrack key={track.publication.trackSid} trackRef={track} muted={muted} />
            ))}

            {/* boxed text buttons, bottom right: MUTE / UNMUTE (browsers only autoplay muted), then full screen */}
            {main && (
                <div className={cn("absolute z-3 flex gap-1.5", isFull ? "right-5 bottom-5" : "right-3.5 bottom-3.5")}>
                    <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
                        {muted ? "Unmute" : "Mute"}
                    </PlayerButton>
                    <PlayerButton label={isFull ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                        {isFull ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                    </PlayerButton>
                </div>
            )}
        </div>
    )
}

function PlayerButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="inline-flex h-7 min-w-7 cursor-pointer items-center justify-center border border-[#cecece] bg-white px-3 text-[12px] leading-4 tracking-[0.12em] text-[#0d0d0d] uppercase hover:bg-[#f3f3f3]"
        >
            {children}
        </button>
    )
}
