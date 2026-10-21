"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, FileText, ImageIcon, Loader2, Star } from "lucide-react"

import RichTextContent from "@/components/common/RichTextContent"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { ArtworkDetail, ArtworkPerson } from "@/lib/types/artwork.types"
import { cn } from "@/lib/utils"
import { getArtwork } from "@/services/operations/artwork.api"

import { DASHBOARD_TIME_ZONE, money, PanelMessage, type PillTone, StatusPill } from "../home/dashboardUi"
import { ARTWORK_STATUS, EDITION_LABELS, formatDimensions, formatEstimate, storefrontHref, VISIBILITY_LABELS } from "./artworkDisplay"

// same split as the backend routes: lot bidders and editing are for super admins / admins
const MANAGE_ROLES = ["SUPER_ADMIN", "ADMIN"]
const EDITABLE_AUCTION_STATUSES = ["DRAFT", "SCHEDULED"]

const PAYMENT_TONES: Record<NonNullable<NonNullable<ArtworkDetail["sale"]>["paymentStatus"]>, PillTone> = {
    PENDING: "amber",
    PAID: "green",
    OVERDUE: "red",
    REFUNDED: "slate",
    CANCELLED: "slate",
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
})
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DASHBOARD_TIME_ZONE })

const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : null)
const formatDay = (iso: string | null) => (iso ? dayFmt.format(new Date(iso)) : null)

const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")

// ---------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-slate-100 px-5 py-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#62666F]">{title}</h3>
            {children}
        </section>
    )
}

/** label / value rows; rows without a value are left out */
function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
    const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== "")
    if (shown.length === 0) return <p className="text-[12px] text-[#8A8D94]">Nothing recorded.</p>
    return (
        <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
            {shown.map(([label, value]) => (
                <div key={label} className="contents">
                    <dt className="text-[#8A8D94]">{label}</dt>
                    <dd className="min-w-0 whitespace-pre-line wrap-break-word text-slate-800">{value}</dd>
                </div>
            ))}
        </dl>
    )
}

function Figure({ label, value, strong }: { label: string; value: string | null; strong?: boolean }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[#8A8D94]">{label}</p>
            <p className={cn("truncate text-[14px] tabular-nums text-slate-900", strong && "font-bold text-[#7B2D52]")}>{value ?? "—"}</p>
        </div>
    )
}

function PersonLink({ person }: { person: ArtworkPerson }) {
    return (
        <>
            <Link href={`/dashboard/users/${person.uuid}`} className="font-semibold hover:text-[#7B2D52] hover:underline">
                {person.name ?? "Bidder"}
            </Link>
            {person.paddle && <span className="text-[#8A8D94]"> · Paddle #{person.paddle}</span>}
        </>
    )
}

function Gallery({ artwork }: { artwork: ArtworkDetail }) {
    const [index, setIndex] = useState(0)
    const media = artwork.media
    const current = media[index]

    return (
        <div className="px-5 pb-4">
            <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-[#F1F1F3]">
                {!current ? (
                    <ImageIcon className="h-10 w-10 text-slate-300" aria-hidden />
                ) : current.mediaType === "VIDEO" ? (
                    <video src={current.url} controls className="h-full w-full bg-black object-contain" />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.url} alt={current.caption ?? artwork.title} className="h-full w-full object-contain" />
                )}
            </div>
            {current?.caption && <p className="mt-1 text-[11px] text-[#8A8D94]">{current.caption}</p>}
            {media.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {media.map((item, i) => (
                        <button
                            key={`${item.url}-${i}`}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Show ${item.mediaType === "VIDEO" ? "video" : "image"} ${i + 1}`}
                            className={cn(
                                "flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[#F1F1F3] ring-2 ring-transparent",
                                i === index && "ring-[#7B2D52]"
                            )}
                        >
                            {item.mediaType === "VIDEO" ? (
                                <span className="text-[10px] font-semibold text-[#62666F]">Video</span>
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

const ACTION_LINK =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-900 hover:bg-slate-50"

function Body({ artwork, canManage }: { artwork: ArtworkDetail; canManage: boolean }) {
    const code = artwork.currency.code
    const status = ARTWORK_STATUS[artwork.status]
    const bids = Number(artwork.bidCount)
    const storefront = storefrontHref(artwork.uuid, artwork.auction)
    const canEdit = canManage && EDITABLE_AUCTION_STATUSES.includes(artwork.auction.status)
    const category = [artwork.category, artwork.subCategory].filter(Boolean).join(" › ")

    // the headline number: what it sold for, where it stands, or what it opens at
    const headline =
        artwork.status === "SOLD"
            ? { label: "Hammer price", value: money(artwork.sale?.hammerPrice ?? artwork.currentBid, code) }
            : bids > 0
              ? { label: artwork.status === "ACTIVE" ? "Current bid" : "Top bid", value: money(artwork.currentBid, code) }
              : { label: "Starting bid", value: money(artwork.startingPrice, code) }

    return (
        <>
            {/* header */}
            <div className="px-5 pb-4 pr-12 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    {artwork.isFeatured && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B7862C]">
                            <Star className="h-3 w-3 fill-current" /> Featured
                        </span>
                    )}
                </div>
                <SheetTitle className="mt-2 text-[20px] font-semibold leading-snug text-slate-900">{artwork.title}</SheetTitle>
                <SheetDescription className="text-[13px] text-[#62666F]">
                    {artwork.artist ?? "Unknown artist"}
                    {artwork.year && `, ${artwork.year}`}
                </SheetDescription>
                <p className="mt-1 text-[12px] text-[#8A8D94]">
                    Lot {artwork.itemNumber} ·{" "}
                    <Link href={`/dashboard/auctions/${artwork.auction.uuid}`} className="hover:text-[#7B2D52] hover:underline">
                        {artwork.auction.title}
                    </Link>
                </p>
            </div>

            <Gallery artwork={artwork} />

            {/* key figures */}
            <div className="grid grid-cols-2 gap-2 px-5 pb-4 sm:grid-cols-4">
                <Figure label="Estimate" value={formatEstimate(artwork)} />
                <Figure label="Starting bid" value={money(artwork.startingPrice, code)} />
                <Figure label="Reserve" value={artwork.reservePrice ? money(artwork.reservePrice, code) : "None"} />
                <Figure label={headline.label} value={headline.value} strong />
            </div>

            {artwork.sale && (
                <Section title="Sale">
                    <Facts
                        rows={[
                            ["Buyer", artwork.sale.buyer ? <PersonLink person={artwork.sale.buyer} /> : null],
                            ["Hammer price", artwork.sale.hammerPrice ? money(artwork.sale.hammerPrice, code) : null],
                            ["Buyer's premium", artwork.sale.buyerPremium ? money(artwork.sale.buyerPremium, code) : null],
                            ["Total due", artwork.sale.totalDue ? <span className="font-semibold">{money(artwork.sale.totalDue, code)}</span> : null],
                            [
                                "Payment",
                                artwork.sale.paymentStatus ? (
                                    <StatusPill tone={PAYMENT_TONES[artwork.sale.paymentStatus]}>{humanize(artwork.sale.paymentStatus)}</StatusPill>
                                ) : null,
                            ],
                            ["Sold on", formatDate(artwork.sale.wonAt)],
                            ["Bids", bids > 0 ? bids.toLocaleString("en-IN") : null],
                        ]}
                    />
                    {!artwork.sale.paymentStatus && (
                        <p className="mt-2 text-[11px] text-[#8A8D94]">
                            This lot was sold before winner records were kept, so there&apos;s no premium or payment status on file.
                        </p>
                    )}
                </Section>
            )}

            {!artwork.sale && (artwork.status === "ACTIVE" || artwork.status === "PASSED") && (
                <Section title={artwork.status === "ACTIVE" ? "Bidding now" : "Bidding"}>
                    <Facts
                        rows={[
                            [artwork.status === "ACTIVE" ? "Leading bidder" : "Top bidder", artwork.leader ? <PersonLink person={artwork.leader} /> : "No bids yet"],
                            ["Bids", bids.toLocaleString("en-IN")],
                            [
                                "Reserve",
                                !artwork.reservePrice
                                    ? "No reserve"
                                    : bids > 0 && Number(artwork.currentBid) >= Number(artwork.reservePrice)
                                      ? "Met"
                                      : "Not met",
                            ],
                        ]}
                    />
                </Section>
            )}

            <Section title="Interest">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Figure label="Registered" value={artwork.interest.registeredBidders.toLocaleString("en-IN")} />
                    <Figure label="Verified bidders" value={artwork.interest.verifiedBidders.toLocaleString("en-IN")} />
                    <Figure label="Proxy bids" value={artwork.interest.proxyBids.toLocaleString("en-IN")} />
                    <Figure label="Saved by collectors" value={artwork.interest.savedBy.toLocaleString("en-IN")} />
                </div>
            </Section>

            <Section title="Artwork">
                <Facts
                    rows={[
                        ["Artist", artwork.artist],
                        ["Medium", artwork.medium],
                        ["Year", artwork.year],
                        ["Dimensions", formatDimensions(artwork.dimensions)],
                        ["Edition", EDITION_LABELS[artwork.edition]],
                        ["Category", category || null],
                        ["Insurance value", artwork.insuranceValue ? money(artwork.insuranceValue, code) : null],
                    ]}
                />
                {artwork.description && <RichTextContent html={artwork.description} className="mt-3 text-[13px] leading-relaxed text-slate-700" />}
            </Section>

            <Section title="Provenance & authenticity">
                <Facts
                    rows={[
                        ["Provenance", artwork.catalogue.provenance],
                        ["Previous owner", artwork.catalogue.previousOwner],
                        ["Acquired", [artwork.catalogue.acquisitionMethod, artwork.catalogue.acquisitionDate].filter(Boolean).join(" · ") || null],
                        ["Exhibited", artwork.catalogue.exhibitionHistory],
                        ["Authenticated by", artwork.catalogue.authenticatedBy],
                        ["Authenticated on", formatDay(artwork.catalogue.authenticatedOn)],
                    ]}
                />
            </Section>

            <Section title="Condition">
                <Facts
                    rows={[
                        ["Overall", artwork.condition.overall],
                        ["Frame", artwork.condition.frame],
                        ["Report", artwork.condition.report],
                        ["Notes", artwork.condition.notes],
                        ["Restoration", artwork.condition.restoration],
                    ]}
                />
            </Section>

            {artwork.documents.length > 0 && (
                <Section title={`Documents (${artwork.documents.length})`}>
                    <ul className="flex flex-col gap-1.5">
                        {artwork.documents.map((doc, i) => (
                            <li key={`${doc.fileUrl}-${i}`}>
                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] hover:bg-slate-50"
                                >
                                    <FileText className="h-4 w-4 shrink-0 text-[#7B2D52]" />
                                    <span className="min-w-0 flex-1 truncate text-slate-900">{doc.fileName}</span>
                                    <span className="shrink-0 text-[11px] text-[#8A8D94]">{humanize(doc.documentType)}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section title="Sale details">
                <Facts
                    rows={[
                        [
                            "Auction",
                            <Link key="auction" href={`/dashboard/auctions/${artwork.auction.uuid}`} className="hover:text-[#7B2D52] hover:underline">
                                {artwork.auction.title}
                            </Link>,
                        ],
                        ["Auction status", AUCTION_STATUS_LABELS[artwork.auction.status] ?? artwork.auction.status],
                        ["Sale type", humanize(artwork.auction.auctionType)],
                        ["Visibility", VISIBILITY_LABELS[artwork.auction.visibility]],
                        ["Lot window", `${formatDate(artwork.scheduledStartAt)} – ${formatDate(artwork.scheduledEndAt)}`],
                        ["Added", formatDate(artwork.createdAt)],
                        ["Last updated", formatDate(artwork.updatedAt)],
                    ]}
                />
            </Section>

            {/* actions */}
            <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t border-slate-200 bg-white px-5 py-3">
                <Link href={`/dashboard/auctions/${artwork.auction.uuid}`} className={ACTION_LINK}>
                    Open auction
                </Link>
                <Link href={`/dashboard/bid-history?auction=${artwork.auction.uuid}`} className={ACTION_LINK}>
                    Bid history
                </Link>
                {canManage && (
                    <Link href={`/dashboard/auctions/${artwork.auction.uuid}/lots/${artwork.uuid}/bidders`} className={ACTION_LINK}>
                        Lot bidders
                    </Link>
                )}
                {canEdit && (
                    <Link href={`/dashboard/auctions/${artwork.auction.uuid}/edit`} className={ACTION_LINK}>
                        Edit lot
                    </Link>
                )}
                {storefront && (
                    <a href={storefront} target="_blank" rel="noopener noreferrer" className={cn(ACTION_LINK, "border-[#7B2D52] text-[#7B2D52]")}>
                        View on site <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                )}
            </div>
        </>
    )
}

// =====================================================================
// PANEL
// =====================================================================

export function ArtworkDetails({ lotUuid, onClose }: { lotUuid: string | null; onClose: () => void }) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)
    const canManage = !!role && MANAGE_ROLES.includes(role)

    const [loaded, setLoaded] = useState<{ uuid: string; data: ArtworkDetail | null; error: string | null } | null>(null)

    useEffect(() => {
        if (!lotUuid || !token) return
        let cancelled = false
        getArtwork(lotUuid, token)
            .then((data) => {
                if (!cancelled) setLoaded({ uuid: lotUuid, data, error: null })
            })
            .catch((err) => {
                if (!cancelled) setLoaded({ uuid: lotUuid, data: null, error: getErrorMessage(err) })
            })
        return () => {
            cancelled = true
        }
    }, [lotUuid, token])

    // keep the last artwork on screen while the panel slides shut
    const current = loaded && (loaded.uuid === lotUuid || !lotUuid) ? loaded : null

    return (
        <Sheet open={!!lotUuid} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-white p-0 data-[side=right]:sm:max-w-2xl">
                {current?.data ? (
                    // key: a new artwork starts its gallery on the first image
                    <Body key={current.uuid} artwork={current.data} canManage={canManage} />
                ) : (
                    <div className="p-5 pr-12">
                        <SheetTitle className="sr-only">Artwork details</SheetTitle>
                        <SheetDescription className="sr-only">Catalogue details, pricing and sale result</SheetDescription>
                        {current?.error ? (
                            <PanelMessage>{current.error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading artwork…
                            </PanelMessage>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
