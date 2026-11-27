"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { CheckIcon, EyeOffIcon, Loader2, PlusIcon, SearchIcon, UsersIcon, XIcon } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { LiveAccessAuction, LiveAccessPerson, LiveViewer } from "@/lib/types/liveAccess.types"
import { cn } from "@/lib/utils"
import {
    addLiveViewers,
    getLiveAccessAuctions,
    getLiveViewers,
    removeLiveViewer,
    searchLiveViewerCandidates,
    setLiveAccessRestricted,
} from "@/services/operations/liveAccess.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, StatusPill, type PillTone } from "../home/dashboardUi"

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DASHBOARD_TIME_ZONE,
})

const isLive = (status: string) => status === "LIVE" || status === "PAUSED"

const STATUS_TONES: Record<string, PillTone> = { LIVE: "red", PAUSED: "amber", SCHEDULED: "green", PREVIEW: "green", DRAFT: "slate" }

const personLabel = (p: LiveAccessPerson) => p.name || p.username || p.email

const initials = (p: LiveAccessPerson) =>
    personLabel(p)
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

/**
 * Settings → Live Access: per auction, "only selected bidders can see it while live".
 * Everyone else (guests included) gets the storefront's default "coming soon" banner
 * for that sale. Staff always see it. Super admin only.
 */
export function LiveAccess() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [auctions, setAuctions] = useState<LiveAccessAuction[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
    const [savingSwitch, setSavingSwitch] = useState<string | null>(null)
    // switching a running sale on closes it to everyone not on the list — confirmed first
    const [confirmRestrict, setConfirmRestrict] = useState<LiveAccessAuction | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getLiveAccessAuctions(token)
            .then((list) => {
                if (cancelled) return
                setAuctions(list)
                setSelectedUuid((current) => current ?? list[0]?.uuid ?? null)
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err)))
        return () => {
            cancelled = true
        }
    }, [token])

    const patchAuction = (uuid: string, changes: Partial<LiveAccessAuction>) =>
        setAuctions((list) => list?.map((a) => (a.uuid === uuid ? { ...a, ...changes } : a)) ?? null)

    const saveRestricted = async (auction: LiveAccessAuction, restricted: boolean) => {
        setSavingSwitch(auction.uuid)
        try {
            toast.success(await setLiveAccessRestricted(token, auction.uuid, restricted))
            patchAuction(auction.uuid, { liveAccessRestricted: restricted })
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSavingSwitch(null)
        }
    }

    const toggle = (auction: LiveAccessAuction, restricted: boolean) => {
        if (restricted && isLive(auction.status)) setConfirmRestrict(auction)
        else saveRestricted(auction, restricted)
    }

    if (!auctions) {
        return (
            <PanelMessage>
                {error ?? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading auctions…
                    </>
                )}
            </PanelMessage>
        )
    }

    if (auctions.length === 0) return <PanelMessage>No upcoming or running auctions.</PanelMessage>

    const selected = auctions.find((a) => a.uuid === selectedUuid) ?? null

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* ───────── AUCTIONS ───────── */}
            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="mb-3">
                    <h2 className="text-[15px] font-semibold text-slate-900">Auctions</h2>
                    <p className="text-[12px] text-[#62666F]">
                        Switch an auction on to limit who sees it while it&apos;s live. Pick the bidders on the right.
                    </p>
                </div>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {auctions.map((auction) => {
                        const active = auction.uuid === selectedUuid
                        return (
                            <div
                                key={auction.uuid}
                                className={cn("flex items-center gap-3 px-3 py-3 transition-colors", active ? "bg-[#F6E9EF]/60" : "hover:bg-slate-50")}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelectedUuid(auction.uuid)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    aria-current={active || undefined}
                                >
                                    {auction.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={auction.imageUrl} alt="" className="size-10 shrink-0 rounded-md bg-slate-100 object-cover" />
                                    ) : (
                                        <span className="size-10 shrink-0 rounded-md bg-slate-100" />
                                    )}
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold text-slate-900">{auction.title}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A8D94]">
                                            <StatusPill tone={STATUS_TONES[auction.status] ?? "slate"}>
                                                {AUCTION_STATUS_LABELS[auction.status] ?? auction.status}
                                            </StatusPill>
                                            {auction.liveAccessRestricted ? `${auction.viewerCount} selected` : "Everyone"}
                                        </span>
                                    </span>
                                </button>
                                {savingSwitch === auction.uuid ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                                ) : (
                                    <Switch
                                        checked={auction.liveAccessRestricted}
                                        disabled={savingSwitch !== null}
                                        onCheckedChange={(checked) => toggle(auction, checked)}
                                        aria-label={`Only selected bidders can see ${auction.title} while live`}
                                        className="data-checked:bg-[#7B2D52]"
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ───────── SELECTED AUCTION ───────── */}
            {selected ? (
                <AuctionViewers
                    key={selected.uuid}
                    auction={selected}
                    token={token}
                    onCountChange={(viewerCount) => patchAuction(selected.uuid, { viewerCount })}
                    onToggle={(restricted) => toggle(selected, restricted)}
                    switchBusy={savingSwitch !== null}
                />
            ) : (
                <PanelMessage>Pick an auction to manage its bidders.</PanelMessage>
            )}

            <AlertDialog open={!!confirmRestrict} onOpenChange={(open) => !open && setConfirmRestrict(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Limit &ldquo;{confirmRestrict?.title}&rdquo; now?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This auction is live. Everyone not on its list — including signed-out visitors — is taken out of the sale straight away
                            and sees the default &ldquo;coming soon&rdquo; banner instead. They can&apos;t watch the live video or bid.{" "}
                            {confirmRestrict?.viewerCount
                                ? `${confirmRestrict.viewerCount} selected bidder${confirmRestrict.viewerCount === 1 ? "" : "s"} keep access.`
                                : "No bidders are selected yet, so only staff will see it."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmRestrict) saveRestricted(confirmRestrict, true)
                                setConfirmRestrict(null)
                            }}
                            className="bg-[#7B2D52] text-white hover:bg-[#7B2D52]/90"
                        >
                            Limit access
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function AuctionViewers({
    auction,
    token,
    onCountChange,
    onToggle,
    switchBusy,
}: {
    auction: LiveAccessAuction
    token: string | null
    onCountChange: (count: number) => void
    onToggle: (restricted: boolean) => void
    switchBusy: boolean
}) {
    const [viewers, setViewers] = useState<LiveViewer[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [removing, setRemoving] = useState<string | null>(null)
    // bumped to reload the list after adding
    const [reload, setReload] = useState(0)

    useEffect(() => {
        let cancelled = false
        getLiveViewers(token, auction.uuid)
            .then((data) => {
                if (cancelled) return
                setViewers(data.viewers)
                onCountChange(data.viewers.length)
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err)))
        return () => {
            cancelled = true
        }
        // onCountChange is a fresh closure every render; the list only depends on these
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, auction.uuid, reload])

    const remove = async (viewer: LiveViewer) => {
        setRemoving(viewer.uuid)
        try {
            toast.success(await removeLiveViewer(token, auction.uuid, viewer.uuid))
            const next = (viewers ?? []).filter((v) => v.uuid !== viewer.uuid)
            setViewers(next)
            onCountChange(next.length)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setRemoving(null)
        }
    }

    const live = isLive(auction.status)

    return (
        <section className="space-y-4">
            {/* summary + switch */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-semibold text-slate-900">{auction.title}</p>
                        <p className="mt-0.5 text-[12px] text-[#8A8D94]">
                            {AUCTION_STATUS_LABELS[auction.status] ?? auction.status} · starts {dateFmt.format(new Date(auction.startTime))}
                        </p>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-900">
                        <Switch
                            checked={auction.liveAccessRestricted}
                            disabled={switchBusy}
                            onCheckedChange={onToggle}
                            className="data-checked:bg-[#7B2D52]"
                        />
                        Only selected bidders
                    </label>
                </div>
                <div
                    className={cn(
                        "mt-4 flex gap-3 rounded-lg px-4 py-3 text-[12px]",
                        auction.liveAccessRestricted ? "bg-[#F6E9EF] text-[#7B2D52]" : "bg-slate-50 text-[#62666F]"
                    )}
                >
                    {auction.liveAccessRestricted ? <EyeOffIcon className="mt-0.5 size-4 shrink-0" /> : <UsersIcon className="mt-0.5 size-4 shrink-0" />}
                    <p>
                        {auction.liveAccessRestricted
                            ? live
                                ? "Live now and limited: only staff and the bidders below can see this sale, watch it and bid. Everyone else sees the default “coming soon” banner."
                                : "Limited once it goes live: until then everyone sees it as usual. When it opens, only staff and the bidders below can see it; everyone else sees the default “coming soon” banner."
                            : "Everyone can see this sale while it's live. Switch on “Only selected bidders” to limit it to the bidders below."}
                    </p>
                </div>
            </div>

            <AddBidders auctionUuid={auction.uuid} token={token} onAdded={() => setReload((n) => n + 1)} />

            {/* selected list */}
            <div className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">Selected bidders</h3>
                        <p className="text-[12px] text-[#62666F]">
                            Removing a bidder while the sale is live and limited takes them out of it straight away.
                        </p>
                    </div>
                    {viewers && <span className="font-mono text-[12px] text-[#8A8D94]">{viewers.length}</span>}
                </div>

                {!viewers ? (
                    <PanelMessage>
                        {error ?? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading bidders…
                            </>
                        )}
                    </PanelMessage>
                ) : viewers.length === 0 ? (
                    <PanelMessage>No bidders selected yet. Search above to add some.</PanelMessage>
                ) : (
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {viewers.map((viewer) => (
                            <li key={viewer.uuid} className="flex items-center gap-3 px-4 py-3">
                                <PersonAvatar person={viewer} />
                                <PersonLines person={viewer} extra={viewer.addedBy ? `Added by ${viewer.addedBy}` : undefined} />
                                {removing === viewer.uuid ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => remove(viewer)}
                                        disabled={removing !== null}
                                        aria-label={`Remove ${personLabel(viewer)}`}
                                        title="Remove"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <XIcon />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}

function AddBidders({ auctionUuid, token, onAdded }: { auctionUuid: string; token: string | null; onAdded: () => void }) {
    const [query, setQuery] = useState("")
    const search = useDebouncedValue(query.trim(), 300)
    const [results, setResults] = useState<{ key: string; people: LiveAccessPerson[] } | null>(null)
    const [picked, setPicked] = useState<Map<string, LiveAccessPerson>>(new Map())
    const [adding, setAdding] = useState(false)
    // bumped after adding so those just added drop out of the results
    const [refresh, setRefresh] = useState(0)

    const key = `${search}|${refresh}`
    useEffect(() => {
        let cancelled = false
        searchLiveViewerCandidates(token, auctionUuid, search)
            .then((people) => !cancelled && setResults({ key, people }))
            .catch((err) => {
                if (cancelled) return
                setResults({ key, people: [] })
                toast.error(getErrorMessage(err))
            })
        return () => {
            cancelled = true
        }
    }, [token, auctionUuid, search, key])

    const loading = results?.key !== key

    const togglePick = (person: LiveAccessPerson) =>
        setPicked((current) => {
            const next = new Map(current)
            if (next.has(person.uuid)) next.delete(person.uuid)
            else next.set(person.uuid, person)
            return next
        })

    const add = async () => {
        if (!picked.size) return
        setAdding(true)
        try {
            toast.success(await addLiveViewers(token, auctionUuid, [...picked.keys()]))
            setPicked(new Map())
            setRefresh((n) => n + 1)
            onAdded()
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setAdding(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">Add bidders</h3>
                    <p className="text-[12px] text-[#62666F]">Search by name, email, phone or username. Bidders registered for this sale come first.</p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    onClick={add}
                    disabled={!picked.size || adding}
                    className="bg-[#7B2D52] text-white hover:bg-[#7B2D52]/90"
                >
                    {adding ? <Loader2 className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
                    {picked.size ? `Add ${picked.size} selected` : "Add selected"}
                </Button>
            </div>

            <div className="relative mt-3">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search bidders…"
                    maxLength={100}
                    className="h-9 pl-9"
                    aria-label="Search bidders"
                />
            </div>

            {picked.size > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {[...picked.values()].map((person) => (
                        <button
                            key={person.uuid}
                            type="button"
                            onClick={() => togglePick(person)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#F6E9EF] px-2.5 py-1 text-[11px] font-medium text-[#7B2D52] hover:bg-[#EBD3DF]"
                            aria-label={`Unselect ${personLabel(person)}`}
                        >
                            {personLabel(person)}
                            <XIcon className="size-3" />
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                {loading ? (
                    <p className="flex items-center justify-center px-4 py-6 text-[13px] text-[#62666F]">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                    </p>
                ) : results.people.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-[#62666F]">
                        {search ? "No matching bidders who aren't already selected." : "Every active bidder is already selected."}
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {results.people.map((person) => {
                            const on = picked.has(person.uuid)
                            return (
                                <li key={person.uuid}>
                                    <button
                                        type="button"
                                        onClick={() => togglePick(person)}
                                        aria-pressed={on}
                                        className={cn(
                                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                                            on ? "bg-[#F6E9EF]/60" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex size-4 shrink-0 items-center justify-center rounded border",
                                                on ? "border-[#7B2D52] bg-[#7B2D52] text-white" : "border-slate-300"
                                            )}
                                        >
                                            {on && <CheckIcon className="size-3" />}
                                        </span>
                                        <PersonAvatar person={person} />
                                        <PersonLines person={person} />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}

function PersonAvatar({ person }: { person: LiveAccessPerson }) {
    return person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
    ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#491B3A] text-[11px] font-medium text-white">
            {initials(person)}
        </span>
    )
}

function PersonLines({ person, extra }: { person: LiveAccessPerson; extra?: string }) {
    return (
        <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-slate-900">{personLabel(person)}</span>
                {person.paddleNumber !== null && <StatusPill tone="maroon">Paddle {person.paddleNumber}</StatusPill>}
            </span>
            <span className="block truncate text-[11px] text-[#8A8D94]">
                {[person.email, person.phone, extra].filter(Boolean).join(" · ")}
            </span>
        </span>
    )
}
