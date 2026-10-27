"use client";

import { format } from "date-fns";
import { useFormContext, useWatch } from "react-hook-form";
import { AlertTriangle, CheckCircle2, ImageOff, Pencil, Star } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RichTextContent from "@/components/common/RichTextContent";
import type { AuctionFormData, AuctionLotForm } from "@/lib/types/AuctionsFormData";
import { normalizeTime } from "@/utils/buildAuctionFormData";
import { isImageMedia, isVideoMedia } from "@/utils/lotMedia";

import { useAuctionCategoryName } from "./Lots/LotsDetails";
import {
    FEE_LABEL,
    Field,
    FieldGrid,
    formatMoney,
    LOT_STATUS_STYLES,
    Pill,
    PlainText,
    RichText,
    Section,
    SHIPPING_LABEL,
    toNumber,
    toTitle,
    TYPE_LABEL,
    VISIBILITY_LABEL,
} from "../AuctionView";

// =====================================================================
// FORMATTERS — form dates / times are wall time in the auction's time zone
// =====================================================================

/** "2026-10-12" -> "12 Oct 2026" (parsed as local so the day doesn't shift) */
const formatFormDate = (date?: string) => (date ? format(new Date(`${date}T00:00:00`), "dd MMM yyyy") : null);

/** "2026-10-12" + "14:30" -> "12 Oct 2026, 02:30 PM" */
const formatFormDateTime = (date?: string, time?: string) => {
    if (!date) return null;
    const hhmm = normalizeTime(time ?? "");
    return hhmm ? format(new Date(`${date}T${hhmm}:00`), "dd MMM yyyy, hh:mm a") : formatFormDate(date);
};

const lotThumb = (lot: AuctionLotForm) => {
    const images = (lot.images ?? []).filter(isImageMedia);
    const media = images.find((m) => m.isPrimary) ?? images[0];
    return media ? media.preview || media.url : undefined;
};

/** Local file preview — the object URL lives exactly as long as the <img> (React 19 ref cleanup) */
const FileImage = ({ file }: { file: File }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
        alt=""
        className="h-full w-full object-cover"
        ref={(img) => {
            if (!img) return;
            const url = URL.createObjectURL(file);
            img.src = url;
            return () => URL.revokeObjectURL(url);
        }}
    />
);

/** Edit link in a section header — jumps back to that wizard step */
const EditButton = ({ onClick, label = "Edit" }: { onClick: () => void; label?: string }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
        <Pencil className="h-3 w-3" />
        {label}
    </button>
);

// =====================================================================
// COMPONENT
// =====================================================================

interface AuctionReviewProps {
    /** Problems that would block publishing (validateAuctionForm with "SCHEDULED") */
    issues: string[];
    publishLabel: string;
    onEditStep: (step: number) => void;
    onEditLot: (lotIndex: number) => void;
}

/** Publish step: the wizard's data laid out like the auction details page (AuctionView) */
export default function AuctionReview({ issues, publishLabel, onEditStep, onEditLot }: AuctionReviewProps) {
    const { control } = useFormContext<AuctionFormData>();
    const { basicInfo, schedule, lots, fees, shipping, visibility } = useWatch({ control }) as AuctionFormData;

    const { categoryName, subCategoryName, loading: categoryLoading } = useAuctionCategoryName(
        basicInfo.categoryUuid,
        basicInfo.subCategoryUuid
    );

    // A cover picked in this session wins over the saved one (edit)
    const coverFile =
        basicInfo.coverImage instanceof File && basicInfo.coverImage.type.startsWith("image/")
            ? basicInfo.coverImage
            : null;

    const currencies = basicInfo.currency?.length ? basicInfo.currency : ["INR"];
    const primaryCurrency = currencies.includes(basicInfo.primaryCurrency) ? basicInfo.primaryCurrency : currencies[0];
    const tags = basicInfo.auctionTags ?? [];
    const venue = shipping.venue?.trim() || basicInfo.auctionLocation?.trim();
    const isLiveType = basicInfo.auctionType === "LIVE";

    const category = !basicInfo.categoryUuid
        ? null
        : categoryLoading
            ? "Loading..."
            : categoryName
                ? `${categoryName}${subCategoryName ? ` / ${subCategoryName}` : ""}`
                : "Unknown category";

    return (
        <div className="space-y-6">
            {/* Readiness */}
            {issues.length > 0 ? (
                <div className="flex gap-3 rounded-[8px] border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="text-[13px] text-amber-800">
                        <p className="font-semibold">Fix these before you publish</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p>
                        Everything looks good. Review your auction below, then click <b>{publishLabel}</b>.
                    </p>
                </div>
            )}

            {/* Overview */}
            <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
                    <div className="aspect-video bg-slate-100 lg:aspect-auto lg:min-h-[240px]">
                        {coverFile ? (
                            <FileImage key={`${coverFile.name}-${coverFile.lastModified}`} file={coverFile} />
                        ) : basicInfo.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={basicInfo.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
                                <ImageOff className="h-4 w-4" />
                                No cover image
                            </div>
                        )}
                    </div>

                    <div className="space-y-5 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                                    {TYPE_LABEL[basicInfo.auctionType] ?? basicInfo.auctionType} Auction
                                </span>
                                <h2 className="break-words text-xl font-semibold text-slate-900">
                                    {basicInfo.auctionName?.trim() || (
                                        <span className="text-slate-400">Untitled auction</span>
                                    )}
                                </h2>
                            </div>
                            <EditButton onClick={() => onEditStep(1)} />
                        </div>

                        <RichTextContent
                            html={basicInfo.shortDescription}
                            className="text-sm text-slate-600 [&_a]:text-blue-600 [&_p+p]:mt-2"
                        />

                        <FieldGrid>
                            <Field label="Auction ID / Slug" value={basicInfo.auctionId?.trim() || "From the title"} />
                            <Field label="Category" value={category} />
                            <Field label="Starts" value={formatFormDateTime(schedule.startDate, schedule.startTime)} />
                            <Field label="Ends" value={formatFormDateTime(schedule.endDate, schedule.endTime)} />
                            <Field label="Lots" value={String(lots.length)} />
                            <Field
                                label="Currencies"
                                value={currencies.map((c) => (c === primaryCurrency ? `${c} (primary)` : c)).join(", ")}
                            />
                            <Field label="Location" value={basicInfo.auctionLocation} />
                        </FieldGrid>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Description */}
            <Section title="Description" action={<EditButton onClick={() => onEditStep(1)} />}>
                <RichText html={basicInfo.description} />
            </Section>

            {/* Schedule */}
            <Section title="Schedule" action={<EditButton onClick={() => onEditStep(2)} />}>
                <FieldGrid>
                    <Field label="Starts" value={formatFormDateTime(schedule.startDate, schedule.startTime)} />
                    <Field label="Ends" value={formatFormDateTime(schedule.endDate, schedule.endTime)} />
                    <Field label="Preview Starts" value={formatFormDate(schedule.previewStartAt)} />
                    <Field label="Registration Required" value={schedule.registrationRequired ? "Yes" : "No"} />
                    {schedule.registrationRequired && (
                        <>
                            <Field label="Registration Opens" value={formatFormDate(schedule.registrationStarts)} />
                            <Field label="Registration Deadline" value={formatFormDate(schedule.registrationDeadline)} />
                        </>
                    )}
                    <Field label="Timezone" value={schedule.timezone} />
                    {isLiveType && (
                        <Field
                            label="Extended Bidding"
                            value={
                                schedule.allowExtendedBidding
                                    ? `On · ${toNumber(schedule.auctionExtensionTime) ?? "—"} min`
                                    : "Off"
                            }
                        />
                    )}
                </FieldGrid>
                <p className="mt-4 text-[11px] text-slate-400">Times are in the auction&apos;s time zone.</p>
            </Section>

            {/* Lots */}
            <Section title={`Lots (${lots.length})`} action={<EditButton onClick={() => onEditStep(3)} label="Manage lots" />}>
                {lots.length === 0 ? (
                    <p className="text-[13px] text-slate-400">No lots added to this auction yet.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    {["Lot", "Artwork", "Medium", "Starting bid", "Estimate", "Media", "Starts", "Ends", "Status", ""].map(
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
                                {lots.map((lot, index) => {
                                    const currency = currencies.includes(lot.pricing?.currency)
                                        ? lot.pricing.currency
                                        : primaryCurrency;
                                    const thumb = lotThumb(lot);
                                    const low = formatMoney(lot.pricing?.estimateFrom, currency);
                                    const high = formatMoney(lot.pricing?.estimateTo, currency);
                                    const imageCount = (lot.images ?? []).filter(isImageMedia).length;
                                    const videoCount = (lot.images ?? []).filter(isVideoMedia).length;

                                    return (
                                        <TableRow key={lot.uuid ?? index}>
                                            <TableCell className="px-3">
                                                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-semibold text-[#833b61]">
                                                    #{String(index + 1).padStart(2, "0")}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-3">
                                                <button
                                                    type="button"
                                                    onClick={() => onEditLot(index)}
                                                    className="flex min-w-60 cursor-pointer items-center gap-3 text-left"
                                                >
                                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                                                        {thumb ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-slate-300">
                                                                <ImageOff className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-slate-800 hover:underline">
                                                            {lot.details?.title?.trim() || (
                                                                <span className="text-slate-400">Untitled lot</span>
                                                            )}
                                                            {lot.isFeatured && (
                                                                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                                                            )}
                                                        </p>
                                                        <p className="truncate text-[11px] text-slate-500">
                                                            {[lot.details?.artist, lot.details?.yearCreated].filter(Boolean).join(" · ") || "—"}
                                                        </p>
                                                    </div>
                                                </button>
                                            </TableCell>

                                            <TableCell
                                                className="max-w-40 truncate px-3 text-[12px] text-slate-600"
                                                title={lot.details?.medium ?? ""}
                                            >
                                                {lot.details?.medium || "—"}
                                            </TableCell>
                                            <TableCell className="px-3 text-[12px] font-medium whitespace-nowrap text-slate-800">
                                                {formatMoney(lot.pricing?.startingPrice, currency) ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">
                                                {low || high ? `${low ?? "—"} – ${high ?? "—"}` : "—"}
                                            </TableCell>
                                            <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">
                                                {imageCount} img{videoCount > 0 && ` · ${videoCount} vid`}
                                            </TableCell>
                                            <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">
                                                {formatFormDateTime(lot.schedule?.startDate, lot.schedule?.startTime) ?? "Auction start"}
                                            </TableCell>
                                            <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">
                                                {formatFormDateTime(lot.schedule?.endDate, lot.schedule?.endTime) ?? "Auction end"}
                                            </TableCell>
                                            <TableCell className="px-3">
                                                <Pill className={LOT_STATUS_STYLES[lot.status] ?? "bg-slate-100 text-slate-600"}>
                                                    {toTitle(lot.status || "DRAFT")}
                                                </Pill>
                                            </TableCell>
                                            <TableCell className="px-3 text-right">
                                                <EditButton onClick={() => onEditLot(index)} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Section>

            {/* Fees */}
            <Section title="Fee Configuration" action={<EditButton onClick={() => onEditStep(4)} />}>
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
                                {fees.map((fee, index) => (
                                    <tr key={`${fee.feeType}-${index}`}>
                                        <td className="px-4 py-2.5">
                                            <p className="font-medium text-slate-800">{fee.name}</p>
                                            {fee.description && (
                                                <p className="text-[11px] text-slate-400">{fee.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">{FEE_LABEL[fee.feeType] ?? fee.feeType}</td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-700">
                                            {fee.calculationType === "PERCENTAGE"
                                                ? `${toNumber(fee.value) ?? 0}%`
                                                : (formatMoney(fee.value, primaryCurrency) ?? "—")}
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
                <Section title="Shipping & Venue" action={<EditButton onClick={() => onEditStep(5)} />}>
                    <FieldGrid className="lg:grid-cols-2">
                        <Field
                            label="Shipping Strategy"
                            value={shipping.shippingStrategy ? SHIPPING_LABEL[shipping.shippingStrategy] : null}
                        />
                        <Field label="Mode" value={shipping.isOnline === false ? "Offline" : "Online"} />
                        <Field label="Venue" value={venue} className="lg:col-span-2" />
                    </FieldGrid>
                    {shipping.shippingInfo?.trim() && (
                        <div className="mt-4">
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Shipping Info
                            </p>
                            <PlainText text={shipping.shippingInfo} />
                        </div>
                    )}
                </Section>

                <Section title="Visibility" action={<EditButton onClick={() => onEditStep(6)} />}>
                    <FieldGrid className="lg:grid-cols-2">
                        <Field
                            label="Who can see this auction"
                            value={visibility.visibility ? VISIBILITY_LABEL[visibility.visibility] : null}
                            className="lg:col-span-2"
                        />
                    </FieldGrid>
                </Section>
            </div>

            <Section title="Terms & Conditions" action={<EditButton onClick={() => onEditStep(6)} />}>
                <RichText html={visibility.termsAndConditions} />
            </Section>
        </div>
    );
}
