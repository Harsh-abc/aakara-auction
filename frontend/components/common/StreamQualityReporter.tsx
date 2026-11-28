"use client"

import { useEffect } from "react"
import { useConnectionQualityIndicator, useLocalParticipant } from "@livekit/components-react"
import { ConnectionQuality } from "livekit-client"

import { reportStreamLevel } from "@/lib/networkHealth"

/**
 * Inside a LiveKitRoom: passes LiveKit's connection quality for this tab to the network banner.
 * LiveKit measures it from the real stream — download for a viewer, upload for the auctioneer.
 */
export function StreamQualityReporter() {
    const { localParticipant } = useLocalParticipant()
    const { quality } = useConnectionQualityIndicator({ participant: localParticipant })

    useEffect(() => {
        if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) reportStreamLevel("poor")
        else if (quality === ConnectionQuality.Unknown) reportStreamLevel(null)
        else reportStreamLevel("good")
    }, [quality])

    // out of the room — no say any more
    useEffect(() => () => reportStreamLevel(null), [])

    return null
}
