import {
    ScreenSharePresets,
    VideoPresets,
    type ScreenShareCaptureOptions,
    type TrackPublishOptions,
    type VideoCaptureOptions,
} from "livekit-client"

// who can go live and moderate viewers — mirrors HOST_ROLES in backend/src/routes/liveStream.routes.js
export const HOST_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"]

// fired by the studio when it goes on / off air, so the navbar updates without waiting for its poll
export const ON_AIR_CHANGED_EVENT = "live:on-air-changed"

export type Fps = 24 | 30 | 60
export type Res = 720 | 1080

export const FPS_OPTIONS: Fps[] = [24, 30, 60]
export const RES_OPTIONS: Res[] = [720, 1080]

export const DEFAULT_QUALITY = { res: 720 as Res, fps: 30 as Fps }
export const QUALITY_STORAGE_KEY = "akara-stream-quality"

// bitrate per resolution / fps — higher is smoother and sharper but needs more upload bandwidth
export const BITRATE: Record<Res, Record<Fps, number>> = {
    720: { 24: 1_700_000, 30: 2_500_000, 60: 4_000_000 },
    1080: { 24: 3_000_000, 30: 4_500_000, 60: 7_000_000 },
}

export function cameraOptions(res: Res, fps: Fps): [VideoCaptureOptions, TrackPublishOptions] {
    const base = res === 1080 ? VideoPresets.h1080 : VideoPresets.h720
    return [
        { resolution: { width: base.width, height: base.height, frameRate: fps } },
        {
            videoEncoding: { maxBitrate: BITRATE[res][fps], maxFramerate: fps },
            // lower layers for slow viewers, full quality for fast ones
            simulcast: true,
            videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h540],
            // drop resolution before dropping smoothness
            degradationPreference: "maintain-framerate",
            videoCodec: "vp8",
        },
    ]
}

export function screenOptions(res: Res, fps: Fps): [ScreenShareCaptureOptions, TrackPublishOptions] {
    const base = res === 1080 ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h720fps30
    return [
        {
            audio: true,
            resolution: { width: base.width, height: base.height, frameRate: fps },
            contentHint: fps >= 30 ? "motion" : "detail",
        },
        {
            screenShareEncoding: { maxBitrate: BITRATE[res][fps], maxFramerate: fps },
            degradationPreference: "maintain-framerate",
        },
    ]
}

export const MIC_OPTIONS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
