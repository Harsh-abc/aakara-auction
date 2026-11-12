"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import axios from "axios"
import { AudioTrack, LiveKitRoom, VideoTrack, useRemoteParticipants, useTracks } from "@livekit/components-react"
import { DisconnectReason, Track } from "livekit-client"
import { Maximize2, Minimize2, PictureInPicture2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppSelector } from "@/hooks/redux"
import { getSocket, setSocketToken } from "@/lib/socket"
import { getLiveStreamToken, type LiveStreamAccess } from "@/services/operations/liveStream.api"

import { copyStyles, hasPipHost, openLivePip, useLivePip } from "./livePip"

// LiveKit bills every connected viewer by the minute, so the player only stays connected while it's watched.
// after a dropped connection or a failed token request
const RETRY_MS = 8_000
// waiting for the auctioneer to go live — the backend won't hand out a token for an empty room.
// The socket says "live:on-air" the moment they do (studio / LiveKit webhook); this check only covers a missed event
const OFF_AIR_POLL_MS = 30_000
// after an "on air" nudge LiveKit may not list the auctioneer yet — check again quickly a few times
const NUDGE_RETRY_MS = 2_000
const NUDGE_RETRIES = 4
// a tab in the background this long leaves the room; it rejoins when shown again
const HIDDEN_DISCONNECT_MS = 2 * 60_000
// the auctioneer left the room (ended the stream) — leave almost at once; the grace covers the first moments after joining
const HOST_GONE_DISCONNECT_MS = 4_000

// Document Picture-in-Picture (Chrome / Edge) — not in TypeScript's DOM types yet
declare global {
    interface Window {
        documentPictureInPicture?: {
            requestWindow(options?: { width?: number; height?: number }): Promise<Window>
            window: Window | null
        }
    }
}

// the video is playing in a picture-in-picture window (ours or the browser's)
const pipOpen = () => Boolean(document.pictureInPictureElement || window.documentPictureInPicture?.window)

type LivePlayerProps = {
    auctionUuid: string
    /** shown until the auctioneer's video arrives (the lot image) */
    fallback: ReactNode
    className?: string
}

type StageOptions = {
    /** playing in our picture-in-picture window (LivePipHost): mute and "back to the room" only */
    inPipWindow?: boolean
    onBack?: () => void
    defaultMuted?: boolean
    onMutedChange?: (muted: boolean) => void
    /** Chrome / Edge: our picture-in-picture window opened — hand the stream over to it */
    onPipWindow?: (win: Window, muted: boolean) => void
}

// why the player isn't connecting: not allowed, removed, or playing in another tab / device
type Blocked = { kind: "denied" | "removed" | "elsewhere"; message: string }

/**
 * Watch-only WebRTC player (LiveKit, ~0.3 s behind the room). Signed-in users (and staff) only.
 * Screen share fills the frame with the camera as picture-in-picture; otherwise the camera alone.
 * Picture in picture moves the stream to a floating window that stays open while the user browses the site.
 */
export function LivePlayer({ auctionUuid, fallback, className }: LivePlayerProps) {
    const pip = useLivePip()

    // playing in the floating window — the layout runs it, so this page stays disconnected
    if (pip?.auctionUuid === auctionUuid) {
        return (
            <div className={cn("absolute inset-0 z-3 flex flex-col items-center justify-center gap-2 bg-[#0d0d0d] p-4 text-center text-[11px] text-white/70", className)}>
                <p>Playing in picture in picture</p>
                <button
                    type="button"
                    onClick={() => pip.window.close()}
                    className="cursor-pointer border border-white/30 px-3 py-1.5 text-[10px] tracking-[0.12em] text-white uppercase hover:bg-white/10"
                >
                    Watch here
                </button>
            </div>
        )
    }

    return (
        <LiveConnection
            auctionUuid={auctionUuid}
            fallback={fallback}
            className={className}
            onPipWindow={(win, muted) => openLivePip({ auctionUuid, window: win, href: window.location.pathname, fallback, muted })}
        />
    )
}

/** the connection itself — on the page, or in the picture-in-picture window (LivePipHost) */
export function LiveConnection({ auctionUuid, fallback, className, ...stage }: LivePlayerProps & StageOptions) {
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

    // off air: waiting for the auctioneer — an "on air" nudge fetches a token right away
    const offAirRef = useRef(false)
    // quick re-checks left after a nudge (a nudge during a token request isn't lost either)
    const nudgeRetriesRef = useRef(0)
    const waitOffAir = () => {
        offAirRef.current = true
        retryIn(OFF_AIR_POLL_MS)
    }
    const wakeIfOffAir = () => {
        nudgeRetriesRef.current = NUDGE_RETRIES
        if (!offAirRef.current) return
        offAirRef.current = false
        clearTimeout(retryRef.current)
        setAttempt((n) => n + 1)
    }
    const wakeRef = useRef(wakeIfOffAir)
    useEffect(() => {
        wakeRef.current = wakeIfOffAir
    })

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const onVisibility = () => {
            clearTimeout(timer)
            if (document.visibilityState === "visible") return setHidden(false)
            const leave = () => {
                // still being watched in picture in picture — check again later
                if (pipOpen()) return void (timer = setTimeout(leave, HIDDEN_DISCONNECT_MS))
                setHidden(true)
                setAccess(null)
            }
            timer = setTimeout(leave, HIDDEN_DISCONNECT_MS)
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
            setBlocked({ kind: "denied", message: "Sign in to watch the live auction." })
            return
        }
        let cancelled = false

        getLiveStreamToken(auctionUuid, accessTokenRef.current)
            .then((data) => {
                if (cancelled) return
                offAirRef.current = false
                nudgeRetriesRef.current = 0
                setAccess(data)
            })
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
                // the sale or the auctioneer isn't live yet — wait for the socket to say so
                if (status === 409) {
                    offAirRef.current = true
                    if (nudgeRetriesRef.current > 0) {
                        nudgeRetriesRef.current -= 1
                        return retryIn(NUDGE_RETRY_MS)
                    }
                    return retryIn(OFF_AIR_POLL_MS)
                }
                retryIn(RETRY_MS)
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
        // rejoin after a reconnect (a new token for another user reconnects the socket too).
        // Once in, check again if off air — the auctioneer may have gone live while we weren't listening
        const watch = () =>
            socket.emit("live:watch", { auctionUuid }, (result?: { ok?: boolean }) => {
                if (result?.ok) wakeRef.current()
            })
        // the auctioneer went live (the server only tells eligible tabs in this auction's live room)
        const onAir = (payload: { auctionUuid?: string; onAir?: boolean }) => {
            if (payload?.auctionUuid === auctionUuid && payload.onAir) wakeRef.current()
        }
        socket.on("connect", watch)
        socket.on("live:on-air", onAir)
        if (socket.connected) watch()
        return () => {
            socket.off("connect", watch)
            socket.off("live:on-air", onAir)
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
                {...stage}
                fallback={fallback}
                onIdle={() => {
                    // the auctioneer stopped publishing — don't pay for sitting in an empty room
                    setAccess(null)
                    waitOffAir()
                }}
            />
        </LiveKitRoom>
    )
}

function Stage({
    fallback,
    onIdle,
    inPipWindow = false,
    onBack,
    defaultMuted = true,
    onMutedChange,
    onPipWindow,
}: StageOptions & { fallback: ReactNode; onIdle: () => void }) {
    const boxRef = useRef<HTMLDivElement>(null)
    // browsers only autoplay muted — tap to unmute
    const [muted, setMuted] = useState(defaultMuted)
    const toggleMuted = () => {
        setMuted(!muted)
        onMutedChange?.(!muted)
    }
    const [isFull, setIsFull] = useState(false)
    // picture in picture: Chrome / Edge get a window we draw ourselves (Document PiP — none of the browser's
    // video controls like Live Caption in it, and it survives page changes); other browsers fall back to
    // the <video>'s own PiP window, which closes when the user leaves the page
    const [inVideoPip, setInVideoPip] = useState(false)
    // the stage only renders in the browser (after a token request), so window / document are there
    const docPip = typeof window !== "undefined" ? window.documentPictureInPicture : undefined
    const pipSupported = Boolean(docPip) || (typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled))

    // a camera / mic the auctioneer switched off stays published but muted — a muted camera would only show black,
    // so the lot image shows instead (staying in the room is decided by the host being here, below)
    const videos = useTracks([Track.Source.ScreenShare, Track.Source.Camera], { onlySubscribed: true }).filter(
        (track) => !track.publication.isMuted
    )
    const audios = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio], { onlySubscribed: true }).filter(
        (track) => !track.publication.isMuted
    )

    const screen = videos.find((track) => track.source === Track.Source.ScreenShare)
    const camera = videos.find((track) => track.source === Track.Source.Camera)
    const main = screen ?? camera
    const pip = screen && camera ? camera : undefined

    // the stream lasts as long as the auctioneer is in the room (camera / mic off included — the lot image shows);
    // once they've left ("End live") leave too, so nobody is billed for an empty room.
    // The grace also covers the first moments after joining, before the host shows up in the list.
    const hostHere = useRemoteParticipants().some((participant) => participant.identity.startsWith("host-"))
    const onIdleRef = useRef(onIdle)
    useEffect(() => {
        onIdleRef.current = onIdle
    })
    useEffect(() => {
        if (hostHere) return
        const timer = setTimeout(() => onIdleRef.current(), HOST_GONE_DISCONNECT_MS)
        return () => clearTimeout(timer)
    }, [hostHere])

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

    // fallback PiP: the main video — the first <video> in the box (the camera inset comes after it)
    const mainVideo = () => boxRef.current?.querySelector("video") ?? null
    useEffect(() => {
        const video = mainVideo()
        if (!video) return
        const onEnter = () => setInVideoPip(true)
        const onLeave = () => setInVideoPip(false)
        video.addEventListener("enterpictureinpicture", onEnter)
        video.addEventListener("leavepictureinpicture", onLeave)
        return () => {
            video.removeEventListener("enterpictureinpicture", onEnter)
            video.removeEventListener("leavepictureinpicture", onLeave)
        }
    }, [main?.publication.trackSid])

    const togglePip = async () => {
        if (document.pictureInPictureElement) return void document.exitPictureInPicture().catch(() => {})
        if (docPip && onPipWindow && hasPipHost()) {
            const win = await docPip.requestWindow({ width: 480, height: 270 }).catch(() => null)
            if (!win) return
            copyStyles(win.document)
            win.document.title = document.title
            win.document.body.style.margin = "0"
            onPipWindow(win, muted)
            return
        }
        await mainVideo()?.requestPictureInPicture().catch(() => {})
    }

    const contain = inPipWindow || Boolean(screen) || isFull

    return (
        <div
            ref={boxRef}
            onDoubleClick={main && !inPipWindow ? toggleFullscreen : undefined}
            className={cn("absolute inset-0", isFull || inPipWindow ? "bg-black" : "bg-[#ebebeb]")}
        >
            {main ? (
                <VideoTrack trackRef={main} className={cn("absolute inset-0 h-full w-full bg-black", contain ? "object-contain" : "object-cover")} />
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

            {/* boxed text buttons, bottom right: MUTE / UNMUTE (browsers only autoplay muted), picture in picture, then full screen.
                In the picture-in-picture window: mute and "back to the room" */}
            {(main || inPipWindow) && (
                <div className={cn("absolute z-3 flex gap-1.5", isFull ? "right-5 bottom-5" : inPipWindow ? "right-3 bottom-3" : "right-3.5 bottom-3.5")}>
                    {main && (
                        <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={toggleMuted}>
                            {muted ? "Unmute" : "Mute"}
                        </PlayerButton>
                    )}
                    {inPipWindow ? (
                        <PlayerButton label="Back to the live room" onClick={() => onBack?.()}>
                            <PictureInPicture2 className="size-3.5" />
                        </PlayerButton>
                    ) : (
                        <>
                            {pipSupported && !isFull && (
                                <PlayerButton label={inVideoPip ? "Exit picture in picture" : "Picture in picture"} onClick={togglePip}>
                                    <PictureInPicture2 className="size-3.5" />
                                </PlayerButton>
                            )}
                            <PlayerButton label={isFull ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                                {isFull ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                            </PlayerButton>
                        </>
                    )}
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
