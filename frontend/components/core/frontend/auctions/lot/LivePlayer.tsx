"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import axios from "axios"
import { AudioTrack, LiveKitRoom, VideoTrack, useTracks } from "@livekit/components-react"
import { DisconnectReason, Track } from "livekit-client"
import { Maximize2, Minimize2, Volume2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppSelector } from "@/hooks/redux"
import { getLiveStreamToken, type LiveStreamAccess } from "@/services/operations/liveStream.api"

// after a dropped connection or a failed token request
const RETRY_MS = 8_000

// a stable id per browser, so the auctioneer can remove / ban a guest
function viewerId() {
    const fresh = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)
    try {
        let id = localStorage.getItem("akara-viewer-id")
        if (!id) {
            id = fresh()
            localStorage.setItem("akara-viewer-id", id)
        }
        return id
    } catch {
        return fresh()
    }
}

type LivePlayerProps = {
    auctionUuid: string
    /** shown until the auctioneer's video arrives (the lot image) */
    fallback: ReactNode
    className?: string
}

/**
 * Watch-only WebRTC player (LiveKit, ~0.3 s behind the room).
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
    const [removed, setRemoved] = useState(false)
    const [attempt, setAttempt] = useState(0)

    // a new token on mount, on login / logout, and after each retry
    useEffect(() => {
        let cancelled = false
        let retry: ReturnType<typeof setTimeout> | undefined

        getLiveStreamToken(auctionUuid, viewerId(), accessTokenRef.current)
            .then((data) => !cancelled && setAccess(data))
            .catch((error) => {
                if (cancelled) return
                const status = axios.isAxiosError(error) ? error.response?.status : undefined
                if (status === 403) return setRemoved(true)
                // not configured / no such sale — stay on the lot image
                if (status === 503 || status === 404) return
                retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS)
            })

        return () => {
            cancelled = true
            clearTimeout(retry)
        }
    }, [auctionUuid, userUuid, attempt])

    if (removed) {
        return (
            <div className={cn("absolute inset-0 flex items-center justify-center bg-[#ebebeb] p-4 text-center text-[11px] text-[#717171]", className)}>
                You have been removed from this live stream.
            </div>
        )
    }

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
                if (reason === DisconnectReason.PARTICIPANT_REMOVED) return setRemoved(true)
                if (reason === DisconnectReason.CLIENT_INITIATED) return
                // room closed or network lost — fetch a fresh token and rejoin
                setAccess(null)
                setTimeout(() => setAttempt((n) => n + 1), RETRY_MS)
            }}
            className={cn("absolute inset-0", className)}
        >
            <Stage fallback={fallback} />
        </LiveKitRoom>
    )
}

function Stage({ fallback }: { fallback: ReactNode }) {
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
                    className="absolute right-2.5 bottom-2.5 aspect-video w-1/4 border-2 border-white bg-black object-cover shadow-md"
                />
            )}

            {audios.map((track) => (
                <AudioTrack key={track.publication.trackSid} trackRef={track} muted={muted} />
            ))}

            {main && (
                <div className={cn("absolute z-3 flex gap-1.5", isFull ? "right-5 bottom-5" : "right-3 bottom-3", pip && !isFull && "top-10 bottom-auto")}>
                    <PlayerButton label={muted ? "Unmute" : "Mute"} large={isFull} onClick={() => setMuted((m) => !m)}>
                        {muted ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src="/icons/volume-off.svg" alt="" width={15} height={15} />
                        ) : (
                            <Volume2 className="size-3.75 text-[#1c1b1f]" strokeWidth={1.75} />
                        )}
                    </PlayerButton>
                    <PlayerButton label={isFull ? "Exit full screen" : "Full screen"} large={isFull} onClick={toggleFullscreen}>
                        {isFull ? <Minimize2 className="size-3.5 text-[#1c1b1f]" /> : <Maximize2 className="size-3.5 text-[#1c1b1f]" />}
                    </PlayerButton>
                </div>
            )}

            {main && muted && (
                <button
                    type="button"
                    onClick={() => setMuted(false)}
                    className="absolute bottom-3 left-1/2 z-3 -translate-x-1/2 bg-black/70 px-2.5 py-1.25 text-[9px] tracking-[0.12em] whitespace-nowrap text-white uppercase"
                >
                    Tap to unmute
                </button>
            )}
        </div>
    )
}

function PlayerButton({ label, large, onClick, children }: { label: string; large: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn("flex items-center justify-center bg-white hover:bg-[#f3f3f3]", large ? "h-9 w-10" : "h-5.75 w-7.25")}
        >
            {children}
        </button>
    )
}
