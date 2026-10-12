"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LiveKitRoom } from "@livekit/components-react"
import { DisconnectReason } from "livekit-client"
import { AlertTriangle, RefreshCw } from "lucide-react"

import DashboardFormText from "@/components/common/DashboardFormText"
import { Button, buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { cn } from "@/lib/utils"
import { getLiveAuctions } from "@/services/operations/auction.api"
import { getHostStreamToken, type HostStreamAccess } from "@/services/operations/liveStream.api"

import { GoLiveIcon } from "./GoLiveButton"
import { HOST_ROLES } from "./liveStudio.constants"
import { StudioRoom } from "./StudioRoom"

type Connection =
    | { status: "idle" | "connecting" }
    | { status: "ready"; access: HostStreamAccess }
    | { status: "error"; message: string }
    | { status: "dropped"; message: string }

// /dashboard/go-live — pick a live auction and broadcast to its lot pages
export function LiveStudio() {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)
    const { liveAuctions, liveAuctionsLoading, liveAuctionsError } = useAppSelector((state) => state.auction)
    const canHost = Boolean(role && HOST_ROLES.includes(role))

    useEffect(() => {
        dispatch(getLiveAuctions())
    }, [dispatch])

    const requested = searchParams.get("auction")
    const [pickedUuid, setPickedUuid] = useState<string | null>(requested)
    const selected = liveAuctions.find((auction) => auction.uuid === pickedUuid) ?? liveAuctions[0] ?? null

    const [attempt, setAttempt] = useState(0)
    const [onAir, setOnAir] = useState(false)

    // the navbar's LIVE link points at the auction on air — follow it, unless we're broadcasting another
    const [lastRequested, setLastRequested] = useState(requested)
    if (requested !== lastRequested) {
        setLastRequested(requested)
        if (requested && !onAir) setPickedUuid(requested)
    }

    // each auction / reconnect attempt gets its own studio token; until it lands we're connecting
    const selectedUuid = selected?.uuid
    const requestKey = selectedUuid && canHost ? `${selectedUuid}:${attempt}` : null
    const [result, setResult] = useState<{ key: string } & Connection>({ key: "", status: "idle" })
    const connection: Connection = requestKey && result.key !== requestKey ? { status: "connecting" } : result

    // read at request time — a refreshed access token shouldn't reconnect the studio
    const tokenRef = useRef(token)
    useEffect(() => {
        tokenRef.current = token
    })

    useEffect(() => {
        if (!requestKey || !selectedUuid) return
        let cancelled = false
        getHostStreamToken(selectedUuid, tokenRef.current)
            .then((access) => !cancelled && setResult({ key: requestKey, status: "ready", access }))
            .catch((error) => {
                if (cancelled) return
                setResult({ key: requestKey, status: "error", message: getErrorMessage(error, "Could not open the studio. Try again.") })
            })
        return () => {
            cancelled = true
        }
    }, [requestKey, selectedUuid])

    const setConnection = (next: Connection) => requestKey && setResult({ key: requestKey, ...next })

    const pick = (uuid: string) => {
        setPickedUuid(uuid)
        router.replace(`/dashboard/go-live?auction=${uuid}`, { scroll: false })
    }

    const header = (
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div>
                <DashboardFormText text="Go Live" className="text-[24px]" />
                <p className="mt-1 text-sm text-slate-500">Stream the auction floor to bidders on the live lot pages.</p>
            </div>

            {liveAuctions.length > 0 && (
                <div className="flex items-center gap-2">
                    <Select
                        items={liveAuctions.map((auction) => ({ value: auction.uuid, label: auction.title }))}
                        value={selected?.uuid ?? null}
                        onValueChange={(value) => value && pick(value as string)}
                        disabled={onAir}
                    >
                        <SelectTrigger
                            className="w-72 max-w-full border-slate-200 bg-white text-slate-700 shadow-none"
                            title={onAir ? "End the stream to switch auctions" : undefined}
                        >
                            <SelectValue placeholder="Choose an auction" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                <SelectLabel className="text-slate-500">Live auctions</SelectLabel>
                                {liveAuctions.map((auction) => (
                                    <SelectItem key={auction.uuid} value={auction.uuid} className="text-slate-700">
                                        {auction.title}
                                        {auction.status === "PAUSED" && <span className="ml-1 text-xs text-amber-600">(paused)</span>}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        className="rounded-[8px] border-gray-300 bg-transparent text-black"
                        onClick={() => dispatch(getLiveAuctions())}
                        disabled={liveAuctionsLoading || onAir}
                        aria-label="Refresh auctions"
                    >
                        <RefreshCw className={liveAuctionsLoading ? "animate-spin" : undefined} />
                    </Button>
                </div>
            )}
        </div>
    )

    let body: React.ReactNode

    if (!canHost) {
        body = <Notice title="You can't go live" message="Only admins and auctioneers can broadcast a live auction." />
    } else if (liveAuctionsLoading && liveAuctions.length === 0) {
        body = <Skeleton className="aspect-video w-full rounded-xl" />
    } else if (liveAuctionsError && liveAuctions.length === 0) {
        body = (
            <Notice
                title="Couldn't load live auctions"
                message={liveAuctionsError}
                action={
                    <Button variant="outline" onClick={() => dispatch(getLiveAuctions())}>
                        <RefreshCw /> Try again
                    </Button>
                }
            />
        )
    } else if (!selected) {
        body = (
            <Notice
                icon={<GoLiveIcon className="size-7" />}
                title="No auction is live right now"
                message="You can go live once an auction has started. Start one from its page, then come back here."
                action={
                    <Link href="/dashboard/auctions/live-auctions" className={buttonVariants({ variant: "outline" })}>
                        Open live floors
                    </Link>
                }
            />
        )
    } else if (connection.status === "error" || connection.status === "dropped") {
        body = (
            <Notice
                title={connection.status === "dropped" ? "Disconnected from the studio" : "Couldn't open the studio"}
                message={connection.message}
                action={
                    <Button className="bg-[#491B3A] text-white hover:bg-[#5d2449]" onClick={() => setAttempt((n) => n + 1)}>
                        <RefreshCw /> Reconnect
                    </Button>
                }
            />
        )
    } else if (connection.status !== "ready") {
        body = <Skeleton className="aspect-video w-full rounded-xl" />
    } else {
        body = (
            <LiveKitRoom
                key={connection.access.auction.uuid}
                serverUrl={connection.access.url}
                token={connection.access.token}
                connect
                audio={false}
                video={false}
                onDisconnected={(reason) => {
                    setOnAir(false)
                    if (reason === DisconnectReason.CLIENT_INITIATED) return
                    setConnection({ status: "dropped", message: "The connection to the stream was lost. Reconnect to keep broadcasting." })
                }}
                onError={(error) => setConnection({ status: "error", message: error.message })}
            >
                <StudioRoom
                    auctionUuid={connection.access.auction.uuid}
                    liveLotUuid={selected.liveLot?.uuid}
                    onLiveChange={setOnAir}
                    onLeave={() => router.push("/dashboard/auctions/live-auctions")}
                />
            </LiveKitRoom>
        )
    }

    return (
        <div className="mx-8 my-9 flex flex-col gap-6">
            {header}
            {body}
        </div>
    )
}

function Notice({ icon, title, message, action }: { icon?: React.ReactNode; title: string; message: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className={cn("flex size-14 items-center justify-center rounded-full bg-[#F3E8EF] text-[#491B3A]")}>
                {icon ?? <AlertTriangle className="size-6" />}
            </span>
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="max-w-md text-sm text-slate-500">{message}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}
