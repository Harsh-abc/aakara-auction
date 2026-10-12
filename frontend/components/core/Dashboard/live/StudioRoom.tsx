"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import toast from "react-hot-toast"
import { VideoTrack, useConnectionState, useLocalParticipant, useMediaDeviceSelect, useTracks } from "@livekit/components-react"
import { ConnectionState, Track } from "livekit-client"
import {
    CheckIcon,
    ChevronUpIcon,
    LogOutIcon,
    MicIcon,
    MicOffIcon,
    MonitorUpIcon,
    Settings2Icon,
    UsersIcon,
    VideoIcon,
    VideoOffIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { GoLiveIcon } from "./GoLiveButton"
import {
    BITRATE,
    DEFAULT_QUALITY,
    FPS_OPTIONS,
    MIC_OPTIONS,
    ON_AIR_CHANGED_EVENT,
    QUALITY_STORAGE_KEY,
    RES_OPTIONS,
    cameraOptions,
    screenOptions,
    type Fps,
    type Res,
} from "./liveStudio.constants"
import { StudioShare } from "./StudioShare"
import { StudioViewers, useViewers } from "./StudioViewers"
import { useActualFps, useLiveTimer } from "./studioHelpers"

type StudioRoomProps = {
    auctionUuid: string
    liveLotUuid?: string | null
    onLiveChange: (live: boolean) => void
    onLeave: () => void
}

type Busy = "live" | "end" | "mic" | "cam" | "screen" | "quality" | "leave" | null

const BRAND = "bg-[#491B3A] text-white hover:bg-[#5d2449]"

function readQuality(): { res: Res; fps: Fps } {
    try {
        const saved = JSON.parse(localStorage.getItem(QUALITY_STORAGE_KEY) ?? "{}")
        return {
            res: RES_OPTIONS.includes(saved.res) ? saved.res : DEFAULT_QUALITY.res,
            fps: FPS_OPTIONS.includes(saved.fps) ? saved.fps : DEFAULT_QUALITY.fps,
        }
    } catch {
        return DEFAULT_QUALITY
    }
}

// the auctioneer's studio: camera / mic / screen, stream quality, viewers and share links
export function StudioRoom({ auctionUuid, liveLotUuid, onLiveChange, onLeave }: StudioRoomProps) {
    const connection = useConnectionState()
    const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
    const viewers = useViewers()

    // the studio only renders in the browser (after the studio token arrives)
    const [{ res, fps }, setQuality] = useState(readQuality)

    const [busy, setBusy] = useState<Busy>(null)
    const [tab, setTab] = useState<"viewers" | "share">("viewers")

    const local = useTracks([Track.Source.ScreenShare, Track.Source.Camera]).filter((track) => track.participant.isLocal)
    const screen = local.find((track) => track.source === Track.Source.ScreenShare)
    const camera = local.find((track) => track.source === Track.Source.Camera)
    const main = screen ?? camera
    const live = Boolean(main) || isMicrophoneEnabled
    const elapsed = useLiveTimer(live)
    const actualFps = useActualFps(main?.publication?.track?.mediaStreamTrack)

    // tell the page (auction picker) and the navbar (LIVE badge) when we go on / off air
    const onLiveChangeRef = useRef(onLiveChange)
    useEffect(() => {
        onLiveChangeRef.current = onLiveChange
    })
    useEffect(() => {
        onLiveChangeRef.current(live)
        // LiveKit's room listing catches up a moment after publishing
        const timer = setTimeout(() => window.dispatchEvent(new Event(ON_AIR_CHANGED_EVENT)), 2000)
        return () => clearTimeout(timer)
    }, [live])

    // closing the tab ends the stream — confirm first
    useEffect(() => {
        if (!live) return
        const warn = (event: BeforeUnloadEvent) => event.preventDefault()
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [live])

    const run = async (key: Exclude<Busy, null>, action: () => Promise<unknown>) => {
        setBusy(key)
        try {
            await action()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.")
        }
        setBusy(null)
    }

    const toggleMic = () => run("mic", () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, MIC_OPTIONS))
    const toggleCam = () => run("cam", () => localParticipant.setCameraEnabled(!isCameraEnabled, ...cameraOptions(res, fps)))
    const toggleScreen = () => run("screen", () => localParticipant.setScreenShareEnabled(!isScreenShareEnabled, ...screenOptions(res, fps)))

    const goLive = () =>
        run("live", async () => {
            await localParticipant.setCameraEnabled(true, ...cameraOptions(res, fps))
            await localParticipant.setMicrophoneEnabled(true, MIC_OPTIONS)
            toast.success("You're live")
        })

    const stopAll = async () => {
        await localParticipant.setScreenShareEnabled(false)
        await localParticipant.setCameraEnabled(false)
        await localParticipant.setMicrophoneEnabled(false)
    }
    const endStream = () => run("end", async () => {
        await stopAll()
        toast.success("Stream ended")
    })
    const leave = () => run("leave", async () => {
        if (live) await stopAll()
        onLeave()
    })

    // a new quality republishes whatever is on
    const applyQuality = (nextRes: Res, nextFps: Fps) =>
        run("quality", async () => {
            setQuality({ res: nextRes, fps: nextFps })
            try {
                localStorage.setItem(QUALITY_STORAGE_KEY, JSON.stringify({ res: nextRes, fps: nextFps }))
            } catch {}
            if (isCameraEnabled) {
                await localParticipant.setCameraEnabled(false)
                await localParticipant.setCameraEnabled(true, ...cameraOptions(nextRes, nextFps))
            }
            if (isScreenShareEnabled) {
                await localParticipant.setScreenShareEnabled(false)
                await localParticipant.setScreenShareEnabled(true, ...screenOptions(nextRes, nextFps))
            }
        })

    const connected = connection === ConnectionState.Connected

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* ---------- stage ---------- */}
            <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-semibold tracking-wide uppercase",
                                live ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                            )}
                        >
                            {live && <span className="size-1.5 animate-pulse rounded-full bg-white" />}
                            {live ? "Live" : "Off air"}
                        </span>
                        {live && <span className="text-sm font-medium text-slate-700 tabular-nums">{elapsed}</span>}
                        {live && (
                            <span className="flex items-center gap-1 text-sm text-slate-500">
                                <UsersIcon className="size-3.5" /> {viewers.length} watching
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {main && (
                            <Chip>
                                {res}p · {actualFps ?? fps} fps
                            </Chip>
                        )}
                        <Chip>
                            <span className={cn("size-1.5 rounded-full", connected ? "bg-emerald-500" : "animate-pulse bg-amber-500")} />
                            {connected ? "Connected" : connection.charAt(0).toUpperCase() + connection.slice(1)}
                        </Chip>
                    </div>
                </header>

                <div className="p-4">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-[#0d0d0d]">
                        {main ? (
                            <VideoTrack trackRef={main} className={cn("absolute inset-0 h-full w-full object-contain", !screen && "-scale-x-100")} />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                                <span className="flex size-14 items-center justify-center rounded-full bg-white/10 text-white">
                                    <GoLiveIcon className="size-7" />
                                </span>
                                <div>
                                    <p className="text-lg font-semibold text-white">{live ? "Audio only" : "You're not broadcasting"}</p>
                                    <p className="mt-1 text-xs text-white/60">
                                        {live
                                            ? "Viewers hear you but see the lot image. Start video or share your screen."
                                            : `Starts camera + microphone at ${res}p · ${fps} fps`}
                                    </p>
                                </div>
                                {!live && (
                                    <Button onClick={goLive} disabled={!!busy || !connected} className={cn("h-10 rounded-lg px-8 text-sm", BRAND)}>
                                        {busy === "live" ? "Starting..." : "Go live"}
                                    </Button>
                                )}
                            </div>
                        )}
                        {screen && camera && (
                            <VideoTrack
                                trackRef={camera}
                                className="absolute right-3 bottom-3 aspect-video w-1/4 min-w-36 -scale-x-100 rounded-md border-2 border-white/80 bg-black object-cover shadow-lg"
                            />
                        )}
                    </div>
                </div>

                {/* ---------- toolbar ---------- */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-1">
                        <ToolButton
                            label={isMicrophoneEnabled ? "Mute" : "Unmute"}
                            icon={isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
                            off={!isMicrophoneEnabled}
                            loading={busy === "mic"}
                            onClick={toggleMic}
                            menu={
                                <>
                                    <DeviceList kind="audioinput" title="Microphone" />
                                    <DeviceList kind="audiooutput" title="Speaker" />
                                </>
                            }
                        />
                        <ToolButton
                            label={isCameraEnabled ? "Stop video" : "Start video"}
                            icon={isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
                            off={!isCameraEnabled}
                            loading={busy === "cam"}
                            onClick={toggleCam}
                            menu={<DeviceList kind="videoinput" title="Camera" />}
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <ToolButton
                            label={isScreenShareEnabled ? "Stop share" : "Share screen"}
                            icon={<MonitorUpIcon />}
                            active={isScreenShareEnabled}
                            loading={busy === "screen"}
                            onClick={toggleScreen}
                        />
                        <ToolButton
                            label="Viewers"
                            icon={<UsersIcon />}
                            badge={viewers.length}
                            active={tab === "viewers"}
                            onClick={() => setTab("viewers")}
                        />
                        <Popover>
                            <PopoverTrigger render={<ToolFace label="Quality" icon={<Settings2Icon />} />} />
                            <PopoverContent side="top" className="w-80 bg-white p-4">
                                <p className="text-sm font-semibold text-slate-900">Stream quality</p>
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Higher fps means smoother motion but needs more upload speed (≈{(BITRATE[res][fps] / 1e6).toFixed(1)} Mbps now).
                                </p>
                                <Segment
                                    label="Frame rate"
                                    options={FPS_OPTIONS.map((value) => ({ value, label: `${value} fps` }))}
                                    value={fps}
                                    disabled={busy === "quality"}
                                    onChange={(value) => applyQuality(res, value)}
                                />
                                <Segment
                                    label="Resolution"
                                    options={RES_OPTIONS.map((value) => ({ value, label: `${value}p` }))}
                                    value={res}
                                    disabled={busy === "quality"}
                                    onChange={(value) => applyQuality(value, fps)}
                                />
                                <p className="text-xs text-slate-500">
                                    {busy === "quality"
                                        ? "Applying..."
                                        : main
                                          ? `Camera is actually sending ${actualFps ?? "..."} fps.`
                                          : "Applied when you go live."}
                                </p>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center">
                        {live ? (
                            <Button onClick={endStream} disabled={!!busy} className="h-9 rounded-lg bg-red-600 px-5 text-white hover:bg-red-700">
                                {busy === "end" ? "Ending..." : "End live"}
                            </Button>
                        ) : (
                            <Button onClick={goLive} disabled={!!busy || !connected} className={cn("h-9 rounded-lg px-5", BRAND)}>
                                <GoLiveIcon className="size-4" />
                                {busy === "live" ? "Starting..." : "Go live"}
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* ---------- side panel ---------- */}
            <aside className="flex h-[640px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:h-auto xl:max-h-[calc(100vh-180px)]">
                <Tabs value={tab} onValueChange={(value) => setTab(value as "viewers" | "share")} className="flex min-h-0 flex-1 flex-col gap-0">
                    <TabsList className="w-full border-b border-slate-100">
                        <TabsTrigger value="viewers" className="flex-1">
                            Viewers
                        </TabsTrigger>
                        <TabsTrigger value="share" className="flex-1">
                            Share
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="viewers" className="flex min-h-0 flex-1 flex-col">
                        <StudioViewers auctionUuid={auctionUuid} />
                    </TabsContent>
                    <TabsContent value="share" className="flex min-h-0 flex-1 flex-col">
                        <StudioShare auctionUuid={auctionUuid} liveLotUuid={liveLotUuid} />
                    </TabsContent>
                </Tabs>
                <div className="border-t border-slate-100 p-3">
                    <Button variant="outline" className="w-full border-slate-200" onClick={leave} disabled={busy === "leave"}>
                        <LogOutIcon />
                        {live ? "End live & leave studio" : "Leave studio"}
                    </Button>
                </div>
            </aside>
        </div>
    )
}

/* ---------------- pieces ---------------- */

function Chip({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
            {children}
        </span>
    )
}

type ToolFaceProps = React.ComponentProps<"button"> & {
    label: string
    icon: ReactNode
    off?: boolean
    active?: boolean
    loading?: boolean
    badge?: number
}

// icon over a label, like a meeting toolbar
function ToolFace({ label, icon, off, active, loading, badge, className, ...props }: ToolFaceProps) {
    return (
        <button
            type="button"
            disabled={loading}
            className={cn(
                "relative flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60",
                active && "bg-[#F3E8EF] text-[#491B3A] hover:bg-[#ecdbe6]",
                className
            )}
            {...props}
        >
            <span className={cn("flex h-5 items-center [&_svg]:size-5", off && "text-red-600")}>{icon}</span>
            <span className="text-[11px] font-medium whitespace-nowrap">{loading ? "..." : label}</span>
            {badge ? (
                <span className="absolute top-0.5 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#491B3A] px-1 text-[10px] font-semibold text-white">
                    {badge > 99 ? "99+" : badge}
                </span>
            ) : null}
        </button>
    )
}

function ToolButton({ menu, onClick, ...face }: Omit<ToolFaceProps, "onClick"> & { onClick: () => void; menu?: ReactNode }) {
    return (
        <div className="flex items-start">
            <ToolFace {...face} onClick={onClick} />
            {menu && (
                <Popover>
                    <PopoverTrigger
                        render={
                            <button
                                type="button"
                                aria-label={`${face.label} options`}
                                className="mt-1 -ml-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            />
                        }
                    >
                        <ChevronUpIcon className="size-3.5" />
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-72 bg-white p-2">
                        {menu}
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}

function DeviceList({ kind, title }: { kind: MediaDeviceKind; title: string }) {
    const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind })

    return (
        <div>
            <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-slate-500">{title}</p>
            {devices.length === 0 ? (
                <p className="px-2 pb-2 text-xs text-slate-400">No {title.toLowerCase()} found</p>
            ) : (
                <ul className="mb-1">
                    {devices.map((item, index) => {
                        const active = item.deviceId === activeDeviceId || (!activeDeviceId && index === 0)
                        return (
                            <li key={item.deviceId || index}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveMediaDevice(item.deviceId).catch(() => toast.error(`Could not switch the ${title.toLowerCase()}`))
                                    }
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                                >
                                    <CheckIcon className={cn("size-3.5 shrink-0 text-[#491B3A]", !active && "invisible")} />
                                    <span className="truncate">{item.label || `${title} ${index + 1}`}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

function Segment<T extends number>({
    label,
    options,
    value,
    disabled,
    onChange,
}: {
    label: string
    options: { value: T; label: string }[]
    value: T
    disabled?: boolean
    onChange: (value: T) => void
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</p>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => option.value !== value && onChange(option.value)}
                        className={cn(
                            "flex-1 rounded-md px-2 py-1.5 text-sm transition-colors disabled:opacity-60",
                            option.value === value ? "bg-[#491B3A] font-medium text-white shadow-sm" : "text-slate-600 hover:bg-white"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
