"use client"

import { useEffect, useMemo, useState } from "react"
import {
    BadgeCheck,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Gavel,
    ImageIcon,
    LayoutGrid,
    List,
    Loader2,
    Palette,
    PercentCircle,
    Radio,
    RefreshCw,
    Search,
    Star,
    Users,
    X,
    XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { ArtworkFilters, ArtworkPage, ArtworkRow, ArtworkSort, ArtworkStage, ArtworkSummary } from "@/lib/types/artwork.types"
import { cn } from "@/lib/utils"
import { getArtworks, getArtworkSummary } from "@/services/operations/artwork.api"

import { money, PanelMessage, Segmented, StatTile, StatusPill } from "../home/dashboardUi"
import { ArtworkDetails } from "./ArtworkDetails"
import { ARTWORK_STATUS, formatDimensions, formatEstimate, priceLine, STAGE_LABELS } from "./artworkDisplay"

const PAGE_SIZES = [24, 48, 96]
const ALL = "ALL"

type View = "grid" | "list"

const SORT_OPTIONS: { value: ArtworkSort; label: string }[] = [
    { value: "newest", label: "Newest added" },
    { value: "title", label: "Title A–Z" },
    { value: "artist", label: "Artist A–Z" },
    { value: "estimate", label: "Highest estimate" },
    { value: "price", label: "Highest bid / hammer" },
]

const STAGES: ArtworkStage[] = ["all", "upcoming", "live", "sold", "unsold", "withdrawn"]

const count = (n: number) => n.toLocaleString("en-IN")

const stageCount = (stage: ArtworkStage, summary: ArtworkSummary | null) => {
    if (!summary) return null
    const { totals } = summary
    return { all: totals.total, upcoming: totals.upcoming, live: totals.live, sold: totals.sold, unsold: totals.unsold, withdrawn: totals.withdrawn }[stage]
}

// ---------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------

function ArtworkImage({ src, title, className }: { src: string | null; title: string; className?: string }) {
    return (
        <div className={cn("flex items-center justify-center overflow-hidden bg-[#F1F1F3]", className)}>
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={title} loading="lazy" className="h-full w-full object-contain" />
            ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" aria-hidden />
            )}
        </div>
    )
}

function ArtworkCard({ row, onOpen }: { row: ArtworkRow; onOpen: () => void }) {
    const status = ARTWORK_STATUS[row.status]
    const price = priceLine(row)
    const estimate = formatEstimate(row)
    const details = [row.medium, row.year].filter(Boolean).join(" · ")
    const dimensions = formatDimensions(row.dimensions)

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#7B2D52] focus-visible:outline-none"
        >
            <div className="relative">
                <ArtworkImage src={row.imageUrl} title={row.title} className="aspect-4/5 w-full p-3 transition-transform group-hover:scale-[1.01]" />
                <div className="absolute left-2 top-2">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </div>
                {row.isFeatured && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#B7862C] shadow-sm" title="Featured lot">
                        <Star className="h-3.5 w-3.5 fill-current" />
                    </span>
                )}
                {row.mediaCount > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {row.mediaCount} media
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-3">
                <p className="truncate text-[11px] text-[#8A8D94]">
                    Lot {row.itemNumber} · {row.auction.title}
                </p>
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">{row.title}</p>
                <p className="truncate text-[12px] text-[#62666F]">{row.artist ?? "Unknown artist"}</p>
                {(details || dimensions) && (
                    <p className="truncate text-[11px] text-[#8A8D94]">{[details, dimensions].filter(Boolean).join(" · ")}</p>
                )}

                <div className="mt-auto pt-2">
                    {estimate && <p className="text-[11px] text-[#8A8D94]">Est. {estimate}</p>}
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-[#62666F]">{price.label}</span>
                        {price.value && <span className="text-[13px] font-bold tabular-nums text-slate-900">{price.value}</span>}
                    </div>
                    {price.note && <p className="text-right text-[10px] text-[#8A8D94]">{price.note}</p>}
                </div>
            </div>
        </button>
    )
}

function ArtworkTable({ rows, onOpen }: { rows: ArtworkRow[]; onOpen: (uuid: string) => void }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-240 text-left text-[12px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-[#62666F]">
                    <tr>
                        <th className="px-4 py-2.5 font-semibold">Artwork</th>
                        <th className="px-4 py-2.5 font-semibold">Auction</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Estimate</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Reserve</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Result</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const status = ARTWORK_STATUS[row.status]
                        const price = priceLine(row)
                        return (
                            <tr
                                key={row.uuid}
                                onClick={() => onOpen(row.uuid)}
                                className="cursor-pointer border-b border-slate-100 align-middle transition-colors last:border-0 hover:bg-slate-50"
                            >
                                <td className="max-w-90 px-4 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <ArtworkImage src={row.imageUrl} title={row.title} className="h-12 w-12 shrink-0 rounded-md p-1" />
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">
                                                {row.isFeatured && <Star className="mr-1 inline h-3 w-3 fill-[#B7862C] text-[#B7862C]" />}
                                                {row.title}
                                            </p>
                                            <p className="truncate text-[11px] text-[#62666F]">
                                                {[row.artist ?? "Unknown artist", row.medium, row.year].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="max-w-60 px-4 py-2.5">
                                    <p className="truncate text-slate-900">{row.auction.title}</p>
                                    <p className="text-[11px] text-[#8A8D94]">
                                        Lot {row.itemNumber} · {AUCTION_STATUS_LABELS[row.auction.status] ?? row.auction.status}
                                    </p>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5">
                                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">{formatEstimate(row) ?? "—"}</td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">
                                    {row.reservePrice ? money(row.reservePrice, row.currency.code) : "None"}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                    <p className="font-semibold tabular-nums text-slate-900">{price.value ?? "—"}</p>
                                    <p className="text-[11px] text-[#8A8D94]">{price.note ?? price.label}</p>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

function ViewToggle({ value, onChange }: { value: View; onChange: (view: View) => void }) {
    const options: { value: View; label: string; icon: React.ReactNode }[] = [
        { value: "grid", label: "Gallery view", icon: <LayoutGrid className="h-4 w-4" /> },
        { value: "list", label: "List view", icon: <List className="h-4 w-4" /> },
    ]
    return (
        <div className="flex h-10 items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={value === option.value}
                    title={option.label}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#62666F] transition-colors",
                        value === option.value ? "bg-[#7B2D52] text-white" : "hover:bg-slate-100"
                    )}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    )
}

// =====================================================================
// PAGE
// =====================================================================

export function Artworks() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim())
    const [auction, setAuction] = useState(ALL)
    const [category, setCategory] = useState(ALL)
    const [stage, setStage] = useState<ArtworkStage>("all")
    const [sort, setSort] = useState<ArtworkSort>("newest")
    const [view, setView] = useState<View>("grid")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [refresh, setRefresh] = useState(0)
    const [openUuid, setOpenUuid] = useState<string | null>(null)

    const filters: ArtworkFilters = useMemo(
        () => ({
            search: search || undefined,
            auctionUuid: auction === ALL ? undefined : auction,
            categoryUuid: category === ALL ? undefined : category,
            stage,
            sort,
        }),
        [search, auction, category, stage, sort]
    )

    const listKey = JSON.stringify({ filters, page, limit, refresh })
    const [list, setList] = useState<{ key: string; data: ArtworkPage | null; error: string | null } | null>(null)
    const [summary, setSummary] = useState<ArtworkSummary | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getArtworks(token, { ...filters, page, limit })
            .then((data) => {
                if (!cancelled) setList({ key: listKey, data, error: null })
            })
            .catch((err) => {
                // keep the last good page on screen
                if (!cancelled) setList((prev) => ({ key: listKey, data: prev?.data ?? null, error: getErrorMessage(err) }))
            })
        return () => {
            cancelled = true
        }
    }, [token, filters, page, limit, listKey])

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getArtworkSummary(token)
            .then((data) => {
                if (!cancelled) setSummary(data)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [token, refresh])

    const loading = list?.key !== listKey
    const rows = list?.data?.artworks ?? null
    const pagination = list?.data?.pagination
    const totals = summary?.totals ?? null
    const hammer = summary?.hammerTotals ?? []
    const hasFilters = !!searchInput || auction !== ALL || category !== ALL || stage !== "all"

    // any filter change starts again at page 1
    const change = (apply: () => void) => {
        apply()
        setPage(1)
    }

    const clearFilters = () =>
        change(() => {
            setSearchInput("")
            setAuction(ALL)
            setCategory(ALL)
            setStage("all")
        })

    const stageOptions = STAGES.map((value) => {
        const n = stageCount(value, summary)
        return { value, label: n === null ? STAGE_LABELS[value] : `${STAGE_LABELS[value]} · ${count(n)}` }
    })

    const topHammer = hammer[0]
    const hammerTitle = hammer.map((h) => `${money(h.total, h.currency.code)} from ${count(h.lots)} lot${h.lots === 1 ? "" : "s"}`).join("\n")

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile icon={<Palette className="h-4 w-4" />} label="Artworks" value={totals?.total ?? null} />
                <StatTile icon={<Users className="h-4 w-4" />} label="Artists" value={totals?.artists ?? null} />
                <StatTile icon={<CalendarClock className="h-4 w-4" />} label="Upcoming" value={totals?.upcoming ?? null} />
                <StatTile icon={<Radio className="h-4 w-4" />} label="On the block now" value={totals?.live ?? null} />
                <StatTile icon={<BadgeCheck className="h-4 w-4" />} label="Sold" value={totals?.sold ?? null} />
                <StatTile icon={<XCircle className="h-4 w-4" />} label="Unsold / passed" value={totals?.unsold ?? null} tone="red" />
                <StatTile
                    icon={<PercentCircle className="h-4 w-4" />}
                    label="Sell-through rate"
                    value={totals ? (totals.sellThroughRate === null ? "—" : `${totals.sellThroughRate}%`) : null}
                    title="Share of the lots offered and closed that sold"
                />
                <StatTile
                    icon={<Gavel className="h-4 w-4" />}
                    label={hammer.length > 1 ? `Hammer total (+${hammer.length - 1} more currenc${hammer.length === 2 ? "y" : "ies"})` : "Hammer total"}
                    value={summary ? (topHammer ? money(topHammer.total, topHammer.currency.code) : money(0)) : null}
                    title={hammerTitle || undefined}
                />
            </div>

            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                {/* filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => change(() => setSearchInput(e.target.value))}
                            placeholder="Search title, artist, medium, lot #…"
                            className="h-10 bg-white pl-9 text-[13px]"
                        />
                    </div>

                    <Select value={auction} onValueChange={(value) => value !== null && change(() => setAuction(value))}>
                        <SelectTrigger className="h-10 w-full bg-white text-[13px] sm:w-60" aria-label="Filter by auction">
                            <SelectValue>
                                <span className="truncate">
                                    {auction === ALL ? "All auctions" : (summary?.auctions.find((a) => a.uuid === auction)?.title ?? "Auction")}
                                </span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All auctions</SelectItem>
                                {summary?.auctions.map((a) => (
                                    <SelectItem key={a.uuid} value={a.uuid}>
                                        {a.title}
                                        <span className="ml-1 text-[11px] text-[#8A8D94]">· {AUCTION_STATUS_LABELS[a.status] ?? a.status}</span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Select value={category} onValueChange={(value) => value !== null && change(() => setCategory(value))}>
                        <SelectTrigger className="h-10 w-full bg-white text-[13px] sm:w-44" aria-label="Filter by category">
                            <SelectValue>
                                <span className="truncate">
                                    {category === ALL ? "All categories" : (summary?.categories.find((c) => c.uuid === category)?.name ?? "Category")}
                                </span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All categories</SelectItem>
                                {summary?.categories.map((c) => (
                                    <SelectItem key={c.uuid} value={c.uuid}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Select value={sort} onValueChange={(value) => value !== null && change(() => setSort(value as ArtworkSort))}>
                        <SelectTrigger className="h-10 w-full bg-white text-[13px] sm:w-48" aria-label="Sort artworks">
                            <SelectValue>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                {SORT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="max-w-full overflow-x-auto">
                        <Segmented value={stage} options={stageOptions} onChange={(value) => change(() => setStage(value))} />
                    </div>
                    {hasFilters && (
                        <Button type="button" variant="ghost" className="h-10 gap-1 text-[12px] text-[#7B2D52]" onClick={clearFilters}>
                            <X className="h-3.5 w-3.5" />
                            Clear filters
                        </Button>
                    )}

                    <div className="ml-auto flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 gap-1.5 bg-white text-[12px]"
                            onClick={() => setRefresh((n) => n + 1)}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", loading && rows && "animate-spin")} />
                            Refresh
                        </Button>
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                {/* results */}
                <div className="mt-4">
                    {!rows ? (
                        list?.error ? (
                            <PanelMessage>{list.error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading artworks…
                            </PanelMessage>
                        )
                    ) : rows.length === 0 ? (
                        <PanelMessage>
                            {hasFilters
                                ? "No artworks match these filters."
                                : "No artworks yet. Lots added to an auction show up here."}
                        </PanelMessage>
                    ) : view === "grid" ? (
                        <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5", loading && "opacity-60")}>
                            {rows.map((row) => (
                                <ArtworkCard key={row.uuid} row={row} onOpen={() => setOpenUuid(row.uuid)} />
                            ))}
                        </div>
                    ) : (
                        <div className={cn(loading && "opacity-60")}>
                            <ArtworkTable rows={rows} onOpen={setOpenUuid} />
                        </div>
                    )}
                </div>

                {/* pagination */}
                {pagination && pagination.total > 0 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#62666F]">
                        <span>
                            {count((pagination.page - 1) * pagination.limit + 1)}–
                            {count(Math.min(pagination.page * pagination.limit, pagination.total))} of {count(pagination.total)} artworks
                        </span>
                        <div className="flex items-center gap-2">
                            <Select value={String(limit)} onValueChange={(value) => value !== null && change(() => setLimit(Number(value)))}>
                                <SelectTrigger className="h-8 w-28 bg-white text-[12px]" aria-label="Artworks per page">
                                    <SelectValue>{limit} / page</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectGroup>
                                        {PAGE_SIZES.map((size) => (
                                            <SelectItem key={size} value={String(size)}>
                                                {size} / page
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <span>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-white"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((p) => p - 1)}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-white"
                                disabled={page >= pagination.totalPages || loading}
                                onClick={() => setPage((p) => p + 1)}
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <ArtworkDetails lotUuid={openUuid} onClose={() => setOpenUuid(null)} />
        </div>
    )
}
