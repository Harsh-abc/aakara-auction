"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { CheckIcon, FlaskConicalIcon, Loader2, MailIcon, SearchIcon, SendIcon, WifiIcon } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type {
    AuctionEmailAuction,
    AuctionEmailDraft,
    AuctionEmailRecipient,
    AuctionEmailSendResult,
    RecipientStatus,
} from "@/lib/types/auctionEmail.types"
import { cn } from "@/lib/utils"
import { getAuctionEmailAuctions, getAuctionEmailRecipients, sendAuctionEmail } from "@/services/operations/auctionEmail.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, StatusPill, type PillTone } from "../home/dashboardUi"

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DASHBOARD_TIME_ZONE,
})

const STATUS_TONES: Record<string, PillTone> = {
    LIVE: "red",
    PAUSED: "amber",
    SCHEDULED: "green",
    PREVIEW: "green",
    DRAFT: "slate",
    ENDED: "slate",
    SETTLED: "slate",
    CANCELLED: "slate",
}

const RECIPIENT_TONES: Record<RecipientStatus, PillTone> = { APPROVED: "green", PENDING: "amber", REJECTED: "red" }
const RECIPIENT_LABELS: Record<RecipientStatus, string> = { APPROVED: "Approved", PENDING: "Pending", REJECTED: "Rejected" }

type StatusFilter = "ALL" | RecipientStatus
const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "APPROVED", label: "Approved" },
    { value: "PENDING", label: "Pending" },
    { value: "REJECTED", label: "Rejected" },
]

const SUBJECT_MAX = 200
const HEADING_MAX = 120
const MESSAGE_MAX = 10000

const EMPTY_DRAFT: AuctionEmailDraft = { subject: "", heading: "", message: "" }

const personLabel = (p: AuctionEmailRecipient) => p.name || p.username || p.email

const initials = (p: AuctionEmailRecipient) =>
    personLabel(p)
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * Settings → Auction Emails: write a message and email it to the bidders registered for one
 * auction, e.g. a last-minute reminder before the sale opens. One email per bidder; every
 * email carries the "Important: Internet Connectivity" notice. Super admin only.
 */
export function AuctionEmails() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [auctions, setAuctions] = useState<AuctionEmailAuction[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
    // kept while switching auctions, so a half-written message isn't lost
    const [draft, setDraft] = useState<AuctionEmailDraft>(EMPTY_DRAFT)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getAuctionEmailAuctions(token)
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

    if (auctions.length === 0) return <PanelMessage>No auctions yet.</PanelMessage>

    const selected = auctions.find((a) => a.uuid === selectedUuid) ?? null

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            {/* ───────── AUCTIONS ───────── */}
            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="mb-3">
                    <h2 className="text-[15px] font-semibold text-slate-900">Auctions</h2>
                    <p className="text-[12px] text-[#62666F]">Pick the auction whose registered bidders should get the email.</p>
                </div>
                <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {auctions.map((auction) => {
                        const active = auction.uuid === selectedUuid
                        return (
                            <button
                                key={auction.uuid}
                                type="button"
                                onClick={() => setSelectedUuid(auction.uuid)}
                                aria-current={active || undefined}
                                className={cn(
                                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                                    active ? "bg-[#F6E9EF]/60" : "hover:bg-slate-50"
                                )}
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
                                        {plural(auction.registeredCount, "registered bidder")}
                                    </span>
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* ───────── COMPOSE + RECIPIENTS ───────── */}
            {selected ? (
                <AuctionComposer key={selected.uuid} auction={selected} token={token} draft={draft} onDraftChange={setDraft} />
            ) : (
                <PanelMessage>Pick an auction to email its bidders.</PanelMessage>
            )}
        </div>
    )
}

function AuctionComposer({
    auction,
    token,
    draft,
    onDraftChange,
}: {
    auction: AuctionEmailAuction
    token: string | null
    draft: AuctionEmailDraft
    onDraftChange: (draft: AuctionEmailDraft) => void
}) {
    const [recipients, setRecipients] = useState<AuctionEmailRecipient[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [picked, setPicked] = useState<Set<string>>(new Set())
    const [query, setQuery] = useState("")
    const [filter, setFilter] = useState<StatusFilter>("ALL")
    const [sending, setSending] = useState<"test" | "send" | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [result, setResult] = useState<AuctionEmailSendResult | null>(null)

    useEffect(() => {
        let cancelled = false
        getAuctionEmailRecipients(token, auction.uuid)
            .then((data) => {
                if (cancelled) return
                setRecipients(data.recipients)
                // approved bidders are the usual audience — picked to start with
                setPicked(new Set(data.recipients.filter((r) => r.status === "APPROVED").map((r) => r.uuid)))
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err)))
        return () => {
            cancelled = true
        }
    }, [token, auction.uuid])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return (recipients ?? []).filter(
            (r) =>
                (filter === "ALL" || r.status === filter) &&
                (!q || [r.name, r.username, r.email, r.phone, r.paddleNumber].some((v) => v?.toLowerCase().includes(q)))
        )
    }, [recipients, query, filter])

    const allVisiblePicked = visible.length > 0 && visible.every((r) => picked.has(r.uuid))

    const togglePick = (uuid: string) =>
        setPicked((current) => {
            const next = new Set(current)
            if (next.has(uuid)) next.delete(uuid)
            else next.add(uuid)
            return next
        })

    const toggleVisible = () =>
        setPicked((current) => {
            const next = new Set(current)
            for (const r of visible) {
                if (allVisiblePicked) next.delete(r.uuid)
                else next.add(r.uuid)
            }
            return next
        })

    const set = (field: keyof AuctionEmailDraft) => (value: string) => onDraftChange({ ...draft, [field]: value })

    const draftReady = draft.subject.trim().length > 0 && draft.message.trim().length > 0

    const send = async (test: boolean) => {
        setSending(test ? "test" : "send")
        setResult(null)
        try {
            const outcome = await sendAuctionEmail(token, auction.uuid, draft, { test, userUuids: test ? [] : [...picked] })
            if (outcome.failed.length) toast.error(outcome.message)
            else toast.success(outcome.message)
            if (!test) setResult(outcome)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSending(null)
        }
    }

    return (
        <section className="space-y-4">
            {/* summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="truncate text-[16px] font-semibold text-slate-900">{auction.title}</p>
                <p className="mt-0.5 text-[12px] text-[#8A8D94]">
                    {AUCTION_STATUS_LABELS[auction.status] ?? auction.status} · starts {dateFmt.format(new Date(auction.startTime))} ·{" "}
                    {plural(auction.registeredCount, "registered bidder")} ({auction.approvedCount} approved)
                </p>
            </div>

            {/* compose */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <h3 className="text-[15px] font-semibold text-slate-900">Message</h3>
                <p className="text-[12px] text-[#62666F]">
                    Each bidder gets their own email, addressed by name with their paddle number. Leave a blank line between paragraphs.
                </p>

                <div className="mt-4 space-y-3">
                    <Field label="Subject" count={draft.subject.length} max={SUBJECT_MAX}>
                        <Input
                            value={draft.subject}
                            onChange={(e) => set("subject")(e.target.value)}
                            maxLength={SUBJECT_MAX}
                            placeholder="e.g. The Fine Art Sale opens in one hour"
                            className="h-9"
                        />
                    </Field>
                    <Field label="Heading (optional)" hint="Shown large at the top of the email. Defaults to the auction's name." count={draft.heading.length} max={HEADING_MAX}>
                        <Input
                            value={draft.heading}
                            onChange={(e) => set("heading")(e.target.value)}
                            maxLength={HEADING_MAX}
                            placeholder={auction.title}
                            className="h-9"
                        />
                    </Field>
                    <Field label="Message" count={draft.message.length} max={MESSAGE_MAX}>
                        <Textarea
                            value={draft.message}
                            onChange={(e) => set("message")(e.target.value)}
                            maxLength={MESSAGE_MAX}
                            rows={8}
                            placeholder={"\"Dear <name>,\" is added for you — start straight with your message.\n\nThe sale opens at 6 PM IST today. Please log in a few minutes early…"}
                            className="min-h-40"
                        />
                    </Field>
                </div>

                <div className="mt-4 flex gap-3 rounded-lg bg-[#F7F1E3] px-4 py-3 text-[12px] text-[#5c4a1e]">
                    <WifiIcon className="mt-0.5 size-4 shrink-0" />
                    <p>
                        Every email also includes the <span className="font-semibold">Important: Internet Connectivity</span> notice — a stable
                        connection is needed to bid, AKARA isn&apos;t responsible for bids lost to the bidder&apos;s connection, and a proxy bid or
                        phone bidding is suggested if theirs is unreliable.
                    </p>
                </div>
            </div>

            {/* recipients */}
            <div className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">Registered bidders</h3>
                        <p className="text-[12px] text-[#62666F]">Approved bidders are picked to start with. Banned registrations never get these emails.</p>
                    </div>
                    {recipients && (
                        <span className="font-mono text-[12px] text-[#8A8D94]">
                            {picked.size} / {recipients.length} picked
                        </span>
                    )}
                </div>

                {!recipients ? (
                    <PanelMessage>
                        {error ?? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading bidders…
                            </>
                        )}
                    </PanelMessage>
                ) : recipients.length === 0 ? (
                    <PanelMessage>Nobody has registered for this auction yet.</PanelMessage>
                ) : (
                    <>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="relative min-w-48 flex-1">
                                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search name, email, phone or paddle…"
                                    maxLength={100}
                                    className="h-9 bg-white pl-9"
                                    aria-label="Search registered bidders"
                                />
                            </div>
                            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Filter by registration status">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setFilter(f.value)}
                                        aria-pressed={filter === f.value}
                                        className={cn(
                                            "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                                            filter === f.value ? "bg-[#7B2D52] text-white" : "text-[#62666F] hover:bg-slate-100"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <button
                                type="button"
                                onClick={toggleVisible}
                                disabled={!visible.length}
                                className="flex w-full items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                                <Tick on={allVisiblePicked} />
                                {allVisiblePicked ? "Unpick" : "Pick"} {visible.length === recipients.length ? "everyone" : `these ${visible.length}`}
                            </button>
                            {visible.length === 0 ? (
                                <p className="px-4 py-6 text-center text-[13px] text-[#62666F]">No registered bidders match.</p>
                            ) : (
                                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                                    {visible.map((person) => {
                                        const on = picked.has(person.uuid)
                                        return (
                                            <li key={person.uuid}>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePick(person.uuid)}
                                                    aria-pressed={on}
                                                    className={cn(
                                                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                                                        on ? "bg-[#F6E9EF]/60" : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <Tick on={on} />
                                                    {person.avatarUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={person.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#491B3A] text-[11px] font-medium text-white">
                                                            {initials(person)}
                                                        </span>
                                                    )}
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex flex-wrap items-center gap-2">
                                                            <span className="truncate text-[13px] font-semibold text-slate-900">{personLabel(person)}</span>
                                                            <StatusPill tone="maroon">Paddle {person.paddleNumber}</StatusPill>
                                                            <StatusPill tone={RECIPIENT_TONES[person.status]}>{RECIPIENT_LABELS[person.status]}</StatusPill>
                                                        </span>
                                                        <span className="block truncate text-[11px] text-[#8A8D94]">
                                                            {[person.email, person.emailVerified ? null : "email not verified", person.phone].filter(Boolean).join(" · ")}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* last send's failures */}
            {result && result.failed.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-800">
                    <p className="font-semibold">
                        Sent to {plural(result.sent, "bidder")}; {result.failed.length} could not be sent:
                    </p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5">
                        {result.failed.map((f) => (
                            <li key={f.uuid}>
                                {f.name || f.email} {f.email && f.name ? `(${f.email})` : ""} — {f.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => send(true)} disabled={!draftReady || sending !== null}>
                    {sending === "test" ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConicalIcon className="size-3.5" />}
                    Send test to me
                </Button>
                <Button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!draftReady || !picked.size || sending !== null}
                    className="bg-[#7B2D52] text-white hover:bg-[#7B2D52]/90"
                >
                    {sending === "send" ? <Loader2 className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
                    {sending === "send" ? "Sending…" : picked.size ? `Send to ${plural(picked.size, "bidder")}` : "Send"}
                </Button>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Email {plural(picked.size, "bidder")}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{draft.subject.trim()}&rdquo; goes out now to {plural(picked.size, "bidder")} registered for{" "}
                            &ldquo;{auction.title}&rdquo;. Emails can&apos;t be recalled once sent — send yourself a test first if you haven&apos;t.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setConfirmOpen(false)
                                send(false)
                            }}
                            className="bg-[#7B2D52] text-white hover:bg-[#7B2D52]/90"
                        >
                            <MailIcon className="size-3.5" />
                            Send emails
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    )
}

function Field({ label, hint, count, max, children }: { label: string; hint?: string; count: number; max: number; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-slate-900">{label}</span>
                <span className="font-mono text-[11px] text-[#8A8D94]">
                    {count}/{max}
                </span>
            </span>
            {children}
            {hint && <span className="mt-1 block text-[11px] text-[#8A8D94]">{hint}</span>}
        </label>
    )
}

function Tick({ on }: { on: boolean }) {
    return (
        <span
            className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border",
                on ? "border-[#7B2D52] bg-[#7B2D52] text-white" : "border-slate-300 bg-white"
            )}
        >
            {on && <CheckIcon className="size-3" />}
        </span>
    )
}
