"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, FileText, ImageOff, Loader2, MoreVertical, Pencil, Star, Trash2, Users } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { deleteLot } from "@/services/operations/auction.api";

import type {
    Auction,
    AuctionLot,
    AuctionStatus,
    AuctionVisibility,
    DocumentType,
    FeeType,
    LotStatus,
    ShippingStrategy,
} from "@/lib/types/auction.types";
import { cn } from "@/lib/utils";
import { isEmptyHtml, sanitizeHtml } from "@/utils/sanitizeHtml";

// =====================================================================
// LABELS
// =====================================================================

const TYPE_LABEL: Record<Auction["auctionType"], string> = {
    LIVE: "Live",
    FLOOR: "Floor",
    HYBRID: "Hybrid",
};

const SHIPPING_LABEL: Record<ShippingStrategy, string> = {
    SHIPPING_INCLUDED: "Shipping Included",
    SHIPPING_CALCULATED_SEPARATELY: "Shipping Calculated Separately",
    BUYER_ARRANGES_PICKUP: "Buyer Arranges Pickup",
    ADMIN_ARRANGES_DELIVERY: "Admin Arranges Delivery",
};

const VISIBILITY_LABEL: Record<AuctionVisibility, string> = {
    PUBLIC: "Public",
    REGISTERED_USERS_ONLY: "Registered Users Only",
    PRIVATE_INVITE_ONLY: "Private (Invite Only)",
};

const FEE_LABEL: Record<FeeType, string> = {
    BUYER_PREMIUM: "Buyer Premium",
    PLATFORM_FEE: "Platform Fee",
    TAX_GST: "Tax / GST",
    PAYMENT_PROCESSING: "Payment Processing",
    LATE_PAYMENT: "Late Payment",
    SHIPPING: "Shipping",
    CUSTOM: "Custom",
};

const DOCUMENT_LABEL: Record<DocumentType, string> = {
    CERTIFICATE_OF_AUTHENTICITY: "Certificate of Authenticity",
    PROVENANCE: "Provenance",
    APPRAISAL: "Appraisal",
    INSURANCE: "Insurance",
    OTHER: "Other",
};

const STATUS_STYLES: Record<AuctionStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-50 text-blue-700",
    PREVIEW: "bg-violet-50 text-violet-700",
    LIVE: "bg-emerald-50 text-emerald-700",
    PAUSED: "bg-amber-50 text-amber-700",
    ENDED: "bg-slate-200 text-slate-700",
    SETTLED: "bg-teal-50 text-teal-700",
    CANCELLED: "bg-red-50 text-red-600",
};

const LOT_STATUS_STYLES: Record<LotStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-50 text-blue-700",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SOLD: "bg-teal-50 text-teal-700",
    UNSOLD: "bg-amber-50 text-amber-700",
    PASSED: "bg-slate-200 text-slate-700",
    WITHDRAWN: "bg-red-50 text-red-600",
};

const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// =====================================================================
// FORMATTERS (always show IST, like the auctions table)
// =====================================================================

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});

const formatDateTime = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d);
};

const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
};

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
};

const formatMoney = (value: unknown, currency: string) => {
    const n = toNumber(value);
    if (n === null) return null;
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        return `${currency} ${n.toLocaleString("en-IN")}`;
    }
};

const formatFileSize = (value: unknown) => {
    const bytes = toNumber(value);
    if (bytes === null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// =====================================================================
// BUILDING BLOCKS
// =====================================================================

const Section = ({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) => (
    <section className="rounded-[8px] border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
            <h4 className="text-base font-semibold text-slate-900">{title}</h4>
            {action}
        </div>
        {children}
    </section>
);

/** Label/value pair — renders "—" for empty values */
const Field = ({ label, value, className }: { label: string; value: ReactNode; className?: string }) => (
    <div className={cn("min-w-0", className)}>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-[13px] text-slate-800">
            {value === null || value === undefined || value === "" ? (
                <span className="text-slate-400">—</span>
            ) : (
                value
            )}
        </dd>
    </div>
);

const FieldGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {children}
    </dl>
);

const Pill = ({ children, className }: { children: ReactNode; className?: string }) => (
    <span
        className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            className
        )}
    >
        {children}
    </span>
);

const RichText = ({ html }: { html?: string | null }) =>
    isEmptyHtml(html) ? (
        <p className="text-[13px] text-slate-400">—</p>
    ) : (
        <div
            className="text-[13px] leading-relaxed text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
    );

const PlainText = ({ text }: { text?: string | null }) =>
    text?.trim() ? (
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{text}</p>
    ) : (
        <p className="text-[13px] text-slate-400">—</p>
    );

// =====================================================================
// LOT DETAILS (opened from the lots table's "View lot")
// =====================================================================

const sortedImages = (lot: AuctionLot) =>
    [...(lot.images ?? [])].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
    );

const LotDetails = ({ lot, currency }: { lot: AuctionLot; currency: string }) => {
    const images = sortedImages(lot);
    const dim = lot.dimension;
    const dimensions = dim
        ? [dim.width, dim.height, dim.depth].filter((v) => toNumber(v) !== null).join(" × ")
        : "";
    const estimateLow = formatMoney(lot.estimateLow, currency);
    const estimateHigh = formatMoney(lot.estimateHigh, currency);

    return (
            <div className="space-y-6">
                {/* Schedule (inside the auction window) */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">Lot Schedule</h5>
                    <FieldGrid>
                        <Field label="Starts" value={formatDateTime(lot.scheduledStartAt)} />
                        <Field label="Ends" value={formatDateTime(lot.scheduledEndAt)} />
                    </FieldGrid>
                </div>

                {/* Media */}
                {images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {images.map((img, i) => (
                            <figure
                                key={img.id ?? img.url}
                                className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                            >
                                {img.mediaType === "VIDEO" ? (
                                    <video src={img.url} controls className="aspect-square w-full object-cover" />
                                ) : (
                                    <a href={img.url} target="_blank" rel="noopener noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img.thumbnailUrl || img.url}
                                            alt={img.caption || `${lot.title} image ${i + 1}`}
                                            className="aspect-square w-full object-cover"
                                        />
                                    </a>
                                )}
                                {img.isPrimary && (
                                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                        Primary
                                    </span>
                                )}
                                {img.caption && (
                                    <figcaption className="truncate px-2 py-1 text-[11px] text-slate-500">
                                        {img.caption}
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-4 py-3 text-[13px] text-slate-400">
                        <ImageOff className="h-4 w-4" />
                        No media uploaded
                    </div>
                )}

                {/* Details */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">Artwork Details</h5>
                    <FieldGrid>
                        <Field label="Artist" value={lot.artistName} />
                        <Field label="Medium" value={lot.medium} />
                        <Field label="Year Created" value={lot.yearCreated} />
                        <Field label="Edition" value={toTitle(lot.editionType)} />
                        <Field
                            label="Dimensions"
                            value={dimensions ? `${dimensions} ${dim?.dimensionUnit.toLowerCase()}` : null}
                        />
                        <Field
                            label="Weight"
                            value={
                                toNumber(dim?.weight) !== null
                                    ? `${dim?.weight} ${dim?.weightUnit?.toLowerCase() ?? ""}`.trim()
                                    : null
                            }
                        />
                    </FieldGrid>
                    {lot.description?.trim() && (
                        <div className="mt-4">
                            <dt className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Description
                            </dt>
                            <PlainText text={lot.description} />
                        </div>
                    )}
                </div>

                {/* Pricing */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">Pricing</h5>
                    <FieldGrid>
                        <Field label="Starting Price" value={formatMoney(lot.startingPrice, currency)} />
                        <Field label="Reserve Price" value={formatMoney(lot.reservePrice, currency)} />
                        <Field
                            label="Estimate"
                            value={
                                estimateLow || estimateHigh
                                    ? `${estimateLow ?? "—"} – ${estimateHigh ?? "—"}`
                                    : null
                            }
                        />
                        <Field label="Current Bid" value={formatMoney(lot.currentBid, currency)} />
                        <Field label="Bids" value={lot.bidCount != null ? String(lot.bidCount) : null} />
                        <Field label="Insurance Value" value={formatMoney(lot.insureanceValue, currency)} />
                        <Field label="GST Rate" value={toNumber(lot.gstRate) !== null ? `${lot.gstRate}%` : null} />
                        <Field label="HSN Code" value={lot.hsnCode} />
                    </FieldGrid>
                </div>

                {/* Condition */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">Condition</h5>
                    <FieldGrid>
                        <Field label="Overall Condition" value={lot.overallCondition} />
                        <Field label="Frame Condition" value={lot.frameCondition} />
                        <Field label="Restoration History" value={lot.restorationHistory} />
                        <Field
                            label="Detailed Notes"
                            value={lot.detailedConditionNotes}
                            className="sm:col-span-2 lg:col-span-3"
                        />
                    </FieldGrid>
                </div>

                {/* Provenance & authentication */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">
                        Provenance &amp; Authentication
                    </h5>
                    <FieldGrid>
                        <Field label="Previous Owner" value={lot.previousOwner} />
                        <Field label="Acquisition Method" value={lot.acquisitionMethod} />
                        <Field label="Acquisition Date" value={formatDate(lot.acquisitionDate)} />
                        <Field label="Authenticated By" value={lot.authenticateBy} />
                        <Field label="Authenticated On" value={formatDate(lot.auctheticateDate)} />
                        <Field
                            label="Exhibition History"
                            value={lot.exhibitionHistory}
                            className="sm:col-span-2 lg:col-span-3"
                        />
                    </FieldGrid>
                </div>

                {/* Documents */}
                <div>
                    <h5 className="mb-3 text-[13px] font-semibold text-slate-700">Documents</h5>
                    {lot.documents?.length ? (
                        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                            {lot.documents.map((doc) => (
                                <li key={doc.id ?? doc.fileUrl} className="flex items-center gap-3 px-4 py-2.5">
                                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block truncate text-[13px] font-medium text-blue-600 hover:underline"
                                        >
                                            {doc.fileName}
                                        </a>
                                        <p className="truncate text-[11px] text-slate-400">
                                            {[DOCUMENT_LABEL[doc.documentType] ?? doc.documentType, formatFileSize(doc.fileSize), doc.description]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-slate-400">No documents uploaded</p>
                    )}
                </div>

                {lot.shippingInfo?.trim() && (
                    <div>
                        <h5 className="mb-2 text-[13px] font-semibold text-slate-700">Shipping Info</h5>
                        <PlainText text={lot.shippingInfo} />
                    </div>
                )}
            </div>
    );
};

// =====================================================================
// LOTS TABLE — one row per lot, actions in a ⋮ menu
// =====================================================================

/** Mirrors the backend: lots can be edited / deleted only on draft or scheduled auctions */
const LOT_EDITABLE_AUCTION_STATUSES: AuctionStatus[] = ["DRAFT", "SCHEDULED"];

const MenuHint = ({ children }: { children: string }) => (
    <span className="ml-auto pl-2 text-[10px] text-slate-400">{children}</span>
);

const DateTime = ({ iso }: { iso?: string | null }) => {
    if (!iso) return <span className="text-slate-400">—</span>;
    const d = new Date(iso);
    return (
        <div className="whitespace-nowrap text-[12px] leading-tight">
            <p className="text-slate-700">{dateFmt.format(d)}</p>
            <p className="text-[11px] text-slate-400">{timeFmt.format(d)}</p>
        </div>
    );
};

const LotsTable = ({
    auction,
    lots,
    fallbackCurrency,
    onLotDeleted,
}: {
    auction: Auction;
    lots: AuctionLot[];
    fallbackCurrency: string;
    onLotDeleted?: (lotUuid: string) => void;
}) => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const role = useAppSelector((state) => state.auth.role);

    const [viewing, setViewing] = useState<AuctionLot | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<AuctionLot | null>(null);
    const [deletingUuid, setDeletingUuid] = useState<string | null>(null);

    // Registrations: admins can view, only a super admin can verify (enforced by the API)
    const canSeeRegistrations = role === "SUPER_ADMIN" || role === "ADMIN";
    const canChangeLots = LOT_EDITABLE_AUCTION_STATUSES.includes(auction.status);
    const canDeleteLots = canChangeLots && canSeeRegistrations; // delete is admin-only on the API
    const lotPath = (lot: AuctionLot) => `/dashboard/auctions/${auction.uuid}/lots/${lot.uuid}`;

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const lot = confirmDelete;
        setDeletingUuid(lot.uuid);
        try {
            const res = await dispatch(deleteLot({ lotUuid: lot.uuid })).unwrap();
            toast.success(res.message);
            setConfirmDelete(null);
            onLotDeleted?.(lot.uuid);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Could not delete the lot. Try again.");
        } finally {
            setDeletingUuid(null);
        }
    };

    if (lots.length === 0) {
        return <p className="text-[13px] text-slate-400">No lots added to this auction yet.</p>;
    }

    return (
        <>
            <div className="overflow-x-auto rounded-md border border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            {["Lot", "Artwork", "Medium", "Starting bid", "Estimate", "Starts", "Ends", "Status", ""].map(
                                (h, i) => (
                                    <TableHead
                                        key={i}
                                        className="h-9 px-3 text-[11px] font-medium whitespace-nowrap text-slate-700"
                                    >
                                        {h}
                                    </TableHead>
                                )
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lots.map((lot) => {
                            const currency = lot.currency?.code ?? fallbackCurrency;
                            const thumb = sortedImages(lot).find((img) => img.mediaType === "IMAGE");
                            const low = formatMoney(lot.estimateLow, currency);
                            const high = formatMoney(lot.estimateHigh, currency);
                            const deleting = deletingUuid === lot.uuid;

                            return (
                                <TableRow key={lot.uuid}>
                                    <TableCell className="px-3">
                                        <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-semibold text-[#833b61]">
                                            #{String(lot.itemNumber).padStart(2, "0")}
                                        </span>
                                    </TableCell>

                                    <TableCell className="px-3">
                                        <button
                                            type="button"
                                            onClick={() => setViewing(lot)}
                                            className="flex min-w-60 cursor-pointer items-center gap-3 text-left"
                                        >
                                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                                                {thumb ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={thumb.thumbnailUrl || thumb.url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-slate-300">
                                                        <ImageOff className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-slate-800 hover:underline">
                                                    {lot.title}
                                                    {lot.isFeatured && (
                                                        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                                                    )}
                                                </p>
                                                <p className="truncate text-[11px] text-slate-500">
                                                    {[lot.artistName, lot.yearCreated].filter(Boolean).join(" · ") || "—"}
                                                </p>
                                            </div>
                                        </button>
                                    </TableCell>

                                    <TableCell className="max-w-40 truncate px-3 text-[12px] text-slate-600" title={lot.medium ?? ""}>
                                        {lot.medium || "—"}
                                    </TableCell>
                                    <TableCell className="px-3 text-[12px] font-medium whitespace-nowrap text-slate-800">
                                        {formatMoney(lot.startingPrice, currency) ?? "—"}
                                    </TableCell>
                                    <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">
                                        {low || high ? `${low ?? "—"} – ${high ?? "—"}` : "—"}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <DateTime iso={lot.scheduledStartAt} />
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <DateTime iso={lot.scheduledEndAt} />
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <Pill className={LOT_STATUS_STYLES[lot.status] ?? "bg-slate-100 text-slate-600"}>
                                            {toTitle(lot.status)}
                                        </Pill>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="px-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-slate-900 data-popup-open:bg-slate-100"
                                                        aria-label={`Actions for lot ${lot.itemNumber}`}
                                                    />
                                                }
                                            >
                                                {deleting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <MoreVertical className="h-4 w-4" />
                                                )}
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem className="py-2 text-[13px]" onClick={() => setViewing(lot)}>
                                                    <Eye />
                                                    View lot
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    className="py-2 text-[13px]"
                                                    disabled={!canChangeLots}
                                                    onClick={() =>
                                                        router.push(`/dashboard/auctions/${auction.uuid}/edit?lot=${lot.uuid}`)
                                                    }
                                                >
                                                    <Pencil />
                                                    Edit lot
                                                    {!canChangeLots && <MenuHint>Draft / scheduled only</MenuHint>}
                                                </DropdownMenuItem>

                                                {canSeeRegistrations && (
                                                    <DropdownMenuItem
                                                        className="py-2 text-[13px]"
                                                        onClick={() => router.push(`${lotPath(lot)}/bidders`)}
                                                    >
                                                        <Users />
                                                        Registrations
                                                    </DropdownMenuItem>
                                                )}

                                                {canSeeRegistrations && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            className="py-2 text-[13px]"
                                                            disabled={!canDeleteLots || deleting}
                                                            onClick={() => setConfirmDelete(lot)}
                                                        >
                                                            <Trash2 />
                                                            Delete lot
                                                            {!canChangeLots && <MenuHint>Draft / scheduled only</MenuHint>}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* View lot */}
            <Sheet open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
                <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-2xl">
                    {viewing && (
                        <>
                            <SheetHeader className="border-b border-slate-200 px-6 py-4 pr-12">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-semibold text-[#833b61]">
                                        Lot {viewing.itemNumber}
                                    </span>
                                    <Pill className={LOT_STATUS_STYLES[viewing.status] ?? "bg-slate-100 text-slate-600"}>
                                        {toTitle(viewing.status)}
                                    </Pill>
                                    {viewing.isFeatured && (
                                        <Pill className="bg-amber-50 text-amber-700">
                                            <Star className="h-3 w-3 fill-current" />
                                            Featured
                                        </Pill>
                                    )}
                                </div>
                                <SheetTitle className="text-lg font-semibold">{viewing.title}</SheetTitle>
                                <SheetDescription>
                                    {[viewing.artistName, viewing.medium].filter(Boolean).join(" · ") || "—"}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="px-6 py-5">
                                <LotDetails lot={viewing} currency={viewing.currency?.code ?? fallbackCurrency} />
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete lot */}
            <AlertDialog
                open={confirmDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !deletingUuid) setConfirmDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete lot {confirmDelete?.itemNumber}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <b>{confirmDelete?.title}</b> and its images and documents are deleted, along with every
                            bidder&apos;s registration and verification on this lot. Registrations for the auction
                            itself stay. This can&apos;t be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!deletingUuid}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={!!deletingUuid}
                            className="bg-red-600 text-white hover:bg-red-600/90"
                        >
                            {deletingUuid ? "Deleting..." : "Delete lot"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

// =====================================================================
// PAGE BODY
// =====================================================================

interface AuctionViewProps {
    auction: Auction;
    lots: AuctionLot[];
    /** Called after a lot is deleted from the lots table */
    onLotDeleted?: (lotUuid: string) => void;
}

/** Read-only, single-page view of everything the create/edit wizard captures */
export default function AuctionView({ auction, lots, onLotDeleted }: AuctionViewProps) {
    const primaryCurrency =
        auction.auctionCurrencies?.find((c) => c.isPrimary)?.currency.code ?? auction.currency?.code ?? "INR";
    const currencies = auction.auctionCurrencies?.length
        ? auction.auctionCurrencies.map((c) => c.currency.code)
        : [primaryCurrency];
    const tags = (auction.tags ?? []).map((t) => t.tag.name);
    const fees = [...(auction.auctionFees ?? [])].sort(
        (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
    );
    const sortedLots = [...lots].sort((a, b) => Number(a.itemNumber) - Number(b.itemNumber));

    return (
        <div className="space-y-6">
            {/* Overview */}
            <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
                    <div className="aspect-video bg-slate-100 lg:aspect-auto lg:min-h-[240px]">
                        {auction.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={auction.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
                                <ImageOff className="h-4 w-4" />
                                No cover image
                            </div>
                        )}
                    </div>

                    <div className="space-y-5 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Pill className={STATUS_STYLES[auction.status] ?? "bg-slate-100 text-slate-600"}>
                                {auction.status === "LIVE" && (
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                )}
                                {toTitle(auction.status)}
                            </Pill>
                            <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                                {TYPE_LABEL[auction.auctionType] ?? auction.auctionType} Auction
                            </span>
                        </div>

                        {auction.short_description?.trim() && (
                            <p className="text-sm text-slate-600">{auction.short_description}</p>
                        )}

                        <FieldGrid>
                            <Field label="Auction ID / Slug" value={auction.slug} />
                            <Field
                                label="Category"
                                value={
                                    auction.category?.name
                                        ? `${auction.category.name}${auction.subCategory?.name ? ` / ${auction.subCategory.name}` : ""}`
                                        : null
                                }
                            />
                            <Field label="Starts" value={formatDateTime(auction.startTime)} />
                            <Field label="Ends" value={formatDateTime(auction.endTime)} />
                            <Field label="Lots" value={String(auction._count?.items ?? lots.length)} />
                            <Field
                                label="Currencies"
                                value={currencies
                                    .map((c) => (c === primaryCurrency ? `${c} (primary)` : c))
                                    .join(", ")}
                            />
                            <Field label="Created By" value={auction.creator?.username} />
                            <Field label="Published" value={formatDateTime(auction.publishedAt)} />
                        </FieldGrid>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Description */}
            <Section title="Description">
                <RichText html={auction.description} />
            </Section>

            {/* Schedule */}
            <Section title="Schedule">
                <FieldGrid>
                    <Field label="Starts" value={formatDateTime(auction.startTime)} />
                    <Field label="Ends" value={formatDateTime(auction.endTime)} />
                    <Field label="Preview Starts" value={formatDateTime(auction.previewStartAt)} />
                    <Field label="Registration Required" value={auction.registrationRequired ? "Yes" : "No"} />
                    {auction.registrationRequired && (
                        <>
                            <Field label="Registration Opens" value={formatDateTime(auction.registrationStarts)} />
                            <Field label="Registration Deadline" value={formatDateTime(auction.registrationDeadline)} />
                        </>
                    )}
                    <Field label="Timezone" value={auction.timezone} />
                </FieldGrid>
                <p className="mt-4 text-[11px] text-slate-400">All times shown in IST.</p>
            </Section>

            {/* Lots */}
            <Section title={`Lots (${sortedLots.length})`}>
                <LotsTable
                    auction={auction}
                    lots={sortedLots}
                    fallbackCurrency={primaryCurrency}
                    onLotDeleted={onLotDeleted}
                />
            </Section>

            {/* Fees */}
            <Section title="Fee Configuration">
                {fees.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Fee</th>
                                    <th className="px-4 py-2.5 font-medium">Type</th>
                                    <th className="px-4 py-2.5 font-medium">Value</th>
                                    <th className="px-4 py-2.5 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {fees.map((fee) => (
                                    <tr key={fee.uuid}>
                                        <td className="px-4 py-2.5">
                                            <p className="font-medium text-slate-800">{fee.name}</p>
                                            {fee.description && (
                                                <p className="text-[11px] text-slate-400">{fee.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">
                                            {FEE_LABEL[fee.feeType] ?? fee.feeType}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-700">
                                            {fee.calculationType === "PERCENTAGE"
                                                ? `${toNumber(fee.value) ?? 0}%`
                                                : formatMoney(fee.value, primaryCurrency)}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Pill
                                                className={
                                                    fee.isActive === false
                                                        ? "bg-slate-100 text-slate-500"
                                                        : "bg-emerald-50 text-emerald-700"
                                                }
                                            >
                                                {fee.isActive === false ? "Inactive" : "Active"}
                                            </Pill>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-[13px] text-slate-400">No fees configured.</p>
                )}
            </Section>

            {/* Shipping & visibility */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Shipping & Venue">
                    <FieldGrid className="lg:grid-cols-2">
                        <Field
                            label="Shipping Strategy"
                            value={auction.shippingStrategy ? SHIPPING_LABEL[auction.shippingStrategy] : null}
                        />
                        <Field label="Mode" value={auction.isOnline === false ? "Offline" : "Online"} />
                        <Field label="Venue" value={auction.venue} className="lg:col-span-2" />
                    </FieldGrid>
                </Section>

                <Section title="Visibility">
                    <FieldGrid className="lg:grid-cols-2">
                        <Field
                            label="Who can see this auction"
                            value={auction.visibility ? VISIBILITY_LABEL[auction.visibility] : null}
                            className="lg:col-span-2"
                        />
                    </FieldGrid>
                </Section>
            </div>

            <Section title="Terms & Conditions">
                <RichText html={auction.termsAndConditions} />
            </Section>

            <p className="text-[11px] text-slate-400">
                Created {formatDateTime(auction.createdAt) ?? "—"} · Last updated{" "}
                {formatDateTime(auction.updatedAt) ?? "—"}
            </p>
        </div>
    );
}
