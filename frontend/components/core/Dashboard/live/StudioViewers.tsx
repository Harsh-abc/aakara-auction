"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useRemoteParticipants } from "@livekit/components-react"
import type { RemoteParticipant } from "livekit-client"
import { Ban, SearchIcon, UserMinus, Users } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { cn } from "@/lib/utils"
import { getStreamBans, removeStreamViewer, unbanStreamViewer, type LiveStreamBan } from "@/services/operations/liveStream.api"

import { ago, device, initials, QualityDot } from "./studioHelpers"

const isHost = (participant: RemoteParticipant) => participant.identity.startsWith("host-")

// "joined 5m ago" labels drift without a re-render
const RELABEL_MS = 15_000

export function useViewers() {
    const participants = useRemoteParticipants()
    return useMemo(() => participants.filter((participant) => !isHost(participant)), [participants])
}

export function StudioViewers({ auctionUuid }: { auctionUuid: string }) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const participants = useRemoteParticipants()
    const viewers = useViewers()
    const coHosts = participants.filter(isHost)

    const [query, setQuery] = useState("")
    const [bans, setBans] = useState<LiveStreamBan[]>([])
    const [busyId, setBusyId] = useState<string | null>(null)
    const [pendingBan, setPendingBan] = useState<RemoteParticipant | null>(null)
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

    const remove = async (participant: RemoteParticipant, ban: boolean) => {
        const name = participant.name || participant.identity
        setBusyId(participant.identity)
        try {
            toast.success(await removeStreamViewer(auctionUuid, participant.identity, { ban, name }, token))
            setPendingBan(null)
            if (ban) loadBans()
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

    const shown = useMemo(
        () =>
            viewers
                .filter((participant) => (participant.name || participant.identity).toLowerCase().includes(query.trim().toLowerCase()))
                .sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0)),
        [viewers, query]
    )

    const banning = Boolean(pendingBan && busyId === pendingBan.identity)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Viewers
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{viewers.length}</span>
                </h3>
            </div>

            <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search viewers"
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
                        {viewers.length ? "No viewers match your search." : "No one is watching yet."}
                    </li>
                )}
                {shown.map((participant) => {
                    const name = participant.name || participant.identity
                    const busy = busyId === participant.identity
                    return (
                        <li key={participant.identity} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                            <Avatar name={name} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                                <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                                    <QualityDot quality={participant.connectionQuality} />
                                    {participant.identity.startsWith("user-") ? "Signed in" : "Guest"} · {device(participant.metadata)} · {ago(participant.joinedAt)}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={busy}
                                    onClick={() => remove(participant, false)}
                                    title="Remove now (they can rejoin)"
                                    aria-label={`Remove ${name}`}
                                    className="border-slate-200"
                                >
                                    <UserMinus />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={busy}
                                    onClick={() => setPendingBan(participant)}
                                    title="Remove and block from this stream"
                                    aria-label={`Ban ${name}`}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Ban />
                                </Button>
                            </div>
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
                            They&apos;re removed from the stream now and can&apos;t rejoin this auction&apos;s live video. You can unban them later
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
