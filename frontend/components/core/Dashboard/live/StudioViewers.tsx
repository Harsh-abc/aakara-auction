"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useRemoteParticipants } from "@livekit/components-react"
import type { RemoteParticipant } from "livekit-client"
import { Ban, ExternalLink, MoreVertical, SearchIcon, UserMinus, Users } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useAppSelector } from "@/hooks/redux"
import { useAuctionChannel } from "@/hooks/useAuctionChannel"
import { getErrorMessage } from "@/lib/apiError"
import { getSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import {
    getStreamBans,
    getStreamWatchers,
    removeStreamViewer,
    unbanStreamViewer,
    type LiveStreamBan,
    type LiveStreamWatcher,
} from "@/services/operations/liveStream.api"

import { ago, device, deviceFromUa, initials, QualityDot, viewerKind } from "./studioHelpers"

const isHost = (participant: RemoteParticipant) => participant.identity.startsWith("host-")

// "joined 5m ago" labels drift without a re-render
const RELABEL_MS = 15_000
// the list is pushed on every join / leave; this only catches a server that went away
const WATCHERS_POLL_MS = 30_000

/** someone in the live room: on the page (presence), pulling the video (LiveKit), or both */
export type AudienceMember = {
    /** LiveKit identity, "user-<uuid>" */
    identity: string
    /** the user's uuid — /dashboard/users/{uuid} */
    userUuid: string | null
    name: string
    kind: string
    device: string
    paddleNumber: string | null
    joinedAt?: Date
    /** connected to the stream — has the video */
    participant?: RemoteParticipant
}

const userUuidOf = (identity: string) => (identity.startsWith("user-") ? identity.slice("user-".length) : null)

/**
 * Everyone in the auction's live room: signed-in bidders / staff with the live page open
 * (pushed by the server as they come and go), plus anyone connected to the stream itself.
 */
export function useAudience(auctionUuid: string) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const participants = useRemoteParticipants()
    const [watchers, setWatchers] = useState<LiveStreamWatcher[]>([])

    // only the newest request's answer counts
    const seq = useRef(0)
    const tokenRef = useRef(token)
    useEffect(() => {
        tokenRef.current = token
    })

    const refresh = useCallback(() => {
        const mine = ++seq.current
        getStreamWatchers(auctionUuid, tokenRef.current)
            .then((list) => mine === seq.current && setWatchers(list))
            .catch(() => {})
    }, [auctionUuid])

    // the staff room is where the server announces joins and leaves
    useAuctionChannel(auctionUuid, { onReconnect: refresh }, { staff: true })

    useEffect(() => {
        const socket = getSocket()
        const onChange = (payload: { auctionUuid?: string }) => {
            if (payload?.auctionUuid === auctionUuid) refresh()
        }
        socket.on("live:watchers", onChange)
        refresh()
        const timer = setInterval(refresh, WATCHERS_POLL_MS)
        return () => {
            socket.off("live:watchers", onChange)
            clearInterval(timer)
        }
    }, [auctionUuid, refresh])

    const people = useMemo(() => {
        const byIdentity = new Map<string, AudienceMember>()
        for (const watcher of watchers) {
            byIdentity.set(watcher.identity, {
                identity: watcher.identity,
                userUuid: watcher.uuid,
                name: watcher.name,
                kind: watcher.kind === "staff" ? "Staff" : "Bidder",
                device: deviceFromUa(watcher.userAgent),
                paddleNumber: watcher.paddleNumber,
                joinedAt: new Date(watcher.joinedAt),
            })
        }
        for (const participant of participants) {
            if (isHost(participant)) continue
            const known = byIdentity.get(participant.identity)
            if (known) {
                known.participant = participant
                continue
            }
            // on the stream but not (yet) announced by their page — e.g. the embed player
            byIdentity.set(participant.identity, {
                identity: participant.identity,
                userUuid: userUuidOf(participant.identity),
                name: participant.name || participant.identity,
                kind: viewerKind(participant.metadata),
                device: device(participant.metadata),
                paddleNumber: null,
                joinedAt: participant.joinedAt,
                participant,
            })
        }
        return [...byIdentity.values()].sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0))
    }, [watchers, participants])

    return { people, refresh }
}

export type Audience = ReturnType<typeof useAudience>

export function StudioViewers({ auctionUuid, audience }: { auctionUuid: string; audience: Audience }) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const participants = useRemoteParticipants()
    const coHosts = participants.filter(isHost)
    const { people, refresh } = audience

    const [query, setQuery] = useState("")
    const [bans, setBans] = useState<LiveStreamBan[]>([])
    const [busyId, setBusyId] = useState<string | null>(null)
    const [pendingBan, setPendingBan] = useState<AudienceMember | null>(null)
    const [, relabel] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => relabel((n) => n + 1), RELABEL_MS)
        return () => clearInterval(timer)
    }, [])

    const loadBans = useCallback(() => {
        getStreamBans(auctionUuid, token)
            .then(setBans)
            .catch(() => {})
    }, [auctionUuid, token])

    useEffect(loadBans, [loadBans])

    const remove = async (person: AudienceMember, ban: boolean) => {
        setBusyId(person.identity)
        try {
            toast.success(await removeStreamViewer(auctionUuid, person.identity, { ban, name: person.name }, token))
            setPendingBan(null)
            if (ban) loadBans()
            refresh()
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not remove the viewer. Try again."))
        }
        setBusyId(null)
    }

    const unban = async (identity: string) => {
        setBusyId(identity)
        try {
            toast.success(await unbanStreamViewer(auctionUuid, identity, token))
            loadBans()
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not unban the viewer. Try again."))
        }
        setBusyId(null)
    }

    // a new tab — navigating away from the studio would end the broadcast
    const viewUser = (person: AudienceMember) => {
        if (person.userUuid) window.open(`/dashboard/users/${person.userUuid}`, "_blank", "noopener")
    }

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return people
        return people.filter((person) => [person.name, person.paddleNumber ?? ""].some((text) => text.toLowerCase().includes(q)))
    }, [people, query])

    const onStream = people.filter((person) => person.participant).length
    const banning = Boolean(pendingBan && busyId === pendingBan.identity)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Viewers
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{people.length}</span>
                </h3>
                {people.length > 0 && <span className="text-xs text-slate-500">{onStream} on video</span>}
            </div>

            <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or paddle"
                    className="border-slate-200 bg-white pl-8 shadow-none"
                />
            </div>

            {coHosts.length > 0 && (
                <ul className="space-y-1">
                    {coHosts.map((participant) => (
                        <li key={participant.identity} className="flex items-center gap-3 rounded-lg px-2 py-2">
                            <Avatar name={participant.name || "Host"} tone="host" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{participant.name || "Host"}</p>
                                <p className="text-xs text-slate-500">Host · {ago(participant.joinedAt)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <ul className="space-y-1">
                {shown.length === 0 && (
                    <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
                        <Users className="size-6 text-slate-300" />
                        {people.length ? "No viewers match your search." : "No one is in the live room yet."}
                    </li>
                )}
                {shown.map((person) => {
                    const busy = busyId === person.identity
                    return (
                        <li key={person.identity} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                            <Avatar name={person.name} />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                                    {person.userUuid ? (
                                        <button type="button" onClick={() => viewUser(person)} className="truncate hover:text-[#7B2D52] hover:underline">
                                            {person.name}
                                        </button>
                                    ) : (
                                        <span className="truncate">{person.name}</span>
                                    )}
                                    {person.paddleNumber && (
                                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                            #{person.paddleNumber}
                                        </span>
                                    )}
                                </p>
                                <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                                    {person.participant ? (
                                        <QualityDot quality={person.participant.connectionQuality} />
                                    ) : (
                                        <span className="inline-block size-1.5 shrink-0 rounded-full bg-slate-300" title="On the page, not on the video" />
                                    )}
                                    {person.participant ? "On video" : "On page"} · {person.kind} · {person.device} · {ago(person.joinedAt)}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={busy}
                                            className="shrink-0 text-slate-500 hover:text-slate-900 data-popup-open:bg-slate-100"
                                            aria-label={`Actions for ${person.name}`}
                                        />
                                    }
                                >
                                    <MoreVertical />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {person.userUuid && (
                                        <>
                                            <DropdownMenuItem className="py-2 text-[13px]" onClick={() => viewUser(person)}>
                                                <ExternalLink />
                                                View user
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuItem className="py-2 text-[13px]" disabled={busy} onClick={() => remove(person, false)}>
                                        <UserMinus />
                                        Remove from stream
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        variant="destructive"
                                        className="py-2 text-[13px]"
                                        disabled={busy}
                                        onClick={() => setPendingBan(person)}
                                    >
                                        <Ban />
                                        Ban from stream
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    )
                })}
            </ul>

            {bans.length > 0 && (
                <>
                    <h3 className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900">
                        Banned
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{bans.length}</span>
                    </h3>
                    <ul className="space-y-1">
                        {bans.map((ban) => (
                            <li key={ban.identity} className="flex items-center gap-3 rounded-lg px-2 py-2">
                                <Avatar name={ban.name || "Viewer"} tone="banned" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">{ban.name || "Viewer"}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        Banned {ago(new Date(ban.createdAt))}
                                        {ban.bannedBy && ` by ${ban.bannedBy}`}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={busyId === ban.identity}
                                    onClick={() => unban(ban.identity)}
                                    className="border-slate-200"
                                >
                                    Unban
                                </Button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <AlertDialog
                open={pendingBan !== null}
                onOpenChange={(open) => {
                    if (!open && !banning) setPendingBan(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ban {pendingBan?.name || "this viewer"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They&apos;re removed from the live room now and can&apos;t rejoin this auction&apos;s live video. You can unban them later
                            from the Banned list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={banning}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => pendingBan && remove(pendingBan, true)}
                            disabled={banning}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {banning ? "Banning..." : "Ban viewer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function Avatar({ name, tone = "viewer" }: { name: string; tone?: "viewer" | "host" | "banned" }) {
    return (
        <span
            className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                tone === "viewer" && "bg-[#F3E8EF] text-[#491B3A]",
                tone === "host" && "bg-[#FFF3D6] text-[#9A6700]",
                tone === "banned" && "bg-red-50 text-red-600"
            )}
        >
            {initials(name) || "?"}
        </span>
    )
}
