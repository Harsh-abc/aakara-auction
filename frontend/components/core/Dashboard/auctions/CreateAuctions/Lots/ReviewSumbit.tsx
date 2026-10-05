"use client";

import { ReactNode } from "react";
import { format } from "date-fns";
import { FileText, Play } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { AuctionFormData, LotImageFile } from "@/lib/types/AuctionsFormData";
import type { DocumentType, DimensionUnit, EditionType } from "@/lib/types/auction.types";
import { useCurrencies } from "@/hooks/useCurrencies";
import {
    getDocumentName,
    getMediaName,
    isImageMedia,
    isVideoMedia,
} from "@/utils/lotMedia";

import { useAuctionCategoryName } from "./LotsDetails";

interface ReviewSubmitProps {
    lotIndex: number;
    onEditStep?: (step: number) => void;
}

// =====================================================================
// LABELS & FORMATTERS
// =====================================================================

const EMPTY = "—";

const EDITION_LABELS: Record<EditionType, string> = {
    UNIQUE: "Unique / Original",
    LIMITED: "Limited Edition",
    OPEN: "Open Edition",
};

const UNIT_LABELS: Record<DimensionUnit, string> = {
    CM: "cm",
    MM: "mm",
    INCH: "inch",
    METER: "m",
    FEET: "ft",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    CERTIFICATE_OF_AUTHENTICITY: "Certificate of Authenticity",
    PROVENANCE: "Provenance",
    APPRAISAL: "Appraisal",
    INSURANCE: "Insurance",
    OTHER: "Other",
};

/** Number inputs use valueAsNumber, so an empty field comes back as NaN. */
const hasNumber = (value: number | null | undefined): value is number =>
    typeof value === "number" && !Number.isNaN(value);

const text = (value?: string | null) => value?.trim() || EMPTY;

/** "PURCHASE" -> "Purchase" */
const titleCase = (value?: string) =>
    value ? value.charAt(0) + value.slice(1).toLowerCase() : EMPTY;

/** Form dates are "yyyy-MM-dd" — parse in local time to avoid a day shift. */
const formatDate = (value?: string) =>
    value ? format(new Date(`${value}T00:00:00`), "dd MMM yyyy") : EMPTY;

/** Blank lot side -> inherits the auction's start / end. */
const formatDateTime = (date?: string, time?: string) =>
    date && time ? format(new Date(`${date}T${time}:00`), "dd MMM yyyy, hh:mm a") : "Auction timing";

// =====================================================================
// COMPONENT
// =====================================================================

export default function ReviewSubmit({ lotIndex, onEditStep }: ReviewSubmitProps) {
    return (
        <div className="w-full space-y-3 pb-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-6">

                <LotDetailsCard lotIndex={lotIndex} onEdit={() => onEditStep?.(1)} canEdit={!!onEditStep} />

                <UploadImagesCard lotIndex={lotIndex} onEdit={() => onEditStep?.(2)} canEdit={!!onEditStep} />

                <PricingValuationCard lotIndex={lotIndex} onEdit={() => onEditStep?.(3)} canEdit={!!onEditStep} />

                <ConditionProvenanceCard lotIndex={lotIndex} onEdit={() => onEditStep?.(4)} canEdit={!!onEditStep} />

            </div>
            <div className="px-6">

                <CertificatesDocsCard lotIndex={lotIndex} onEdit={() => onEditStep?.(5)} canEdit={!!onEditStep} />
            </div>

        </div>
    )
}

interface CardProps {
    lotIndex: number;
    onEdit: () => void;
    canEdit: boolean;
}

interface ReviewCardProps {
    number?: string;
    title: string;
    onEdit?: () => void;
    canEdit?: boolean;
    children: ReactNode;
}

const ReviewCard = ({
    number,
    title,
    onEdit,
    canEdit,
    children,
}: ReviewCardProps) => {
    return (
        <div className="rounded-xl bg-white border border-slate-100 p-5">

            <div className="flex items-center justify-between mb-5">

                <h3 className="text-sm font-semibold text-slate-800">
                    {number && `${number}. `}
                    {title}
                </h3>

                {canEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
                            border
                            border-slate-200
                            px-3
                            py-1.5
                            text-xs
                            font-medium
                            text-slate-600
                            hover:bg-slate-50
                        "
                    >
                        Edit
                    </button>
                )}

            </div>

            {children}

        </div>
    );
};

const DetailRows = ({
    rows,
    labelWidth = "135px",
}: {
    rows: [string, string][];
    labelWidth?: string;
}) => (
    <div className="space-y-3">

        {rows.map(([label, value]) => (
            <div
                key={label}
                className="grid gap-3 text-xs"
                style={{ gridTemplateColumns: `${labelWidth} 1fr` }}
            >
                <span className="text-slate-500">
                    {label}
                </span>

                <span className="font-medium text-slate-700 whitespace-pre-line wrap-break-word">
                    {value}
                </span>
            </div>
        ))}

    </div>
);



const LotDetailsCard = ({ lotIndex, onEdit, canEdit }: CardProps) => {
    const { control } = useFormContext<AuctionFormData>();

    const details = useWatch({ control, name: `lots.${lotIndex}.details` });
    const schedule = useWatch({ control, name: `lots.${lotIndex}.schedule` });
    const categoryUuid = useWatch({ control, name: "basicInfo.categoryUuid" });
    const subCategoryUuid = useWatch({ control, name: "basicInfo.subCategoryUuid" });

    const { categoryName, subCategoryName, loading } = useAuctionCategoryName(
        categoryUuid,
        subCategoryUuid
    );

    const category = !categoryUuid
        ? EMPTY
        : loading
            ? "Loading..."
            : categoryName
                ? subCategoryName
                    ? `${categoryName} / ${subCategoryName}`
                    : categoryName
                : "Unknown category";

    const unit = UNIT_LABELS[details?.dimensions?.unit ?? "CM"];
    const measures = [
        details?.dimensions?.width,
        details?.dimensions?.height,
        details?.dimensions?.depth,
    ].filter(hasNumber);

    const dimensions = measures.length
        ? measures.map((value) => `${value} ${unit}`).join(" × ")
        : EMPTY;

    const rows: [string, string][] = [
        ["Lot Title", text(details?.title)],
        ["Artist Name", text(details?.artist)],
        ["Artwork ID", text(details?.artworkId)],
        ["Category", category],
        ["Lot Starts", formatDateTime(schedule?.startDate, schedule?.startTime)],
        ["Lot Ends", formatDateTime(schedule?.endDate, schedule?.endTime)],
        ["Medium", text(details?.medium)],
        ["Year of Creation", text(details?.yearCreated)],
        ["Dimensions (W × H × D)", dimensions],
        ["Weight", hasNumber(details?.weight) ? `${details.weight} kg` : EMPTY],
        ["Edition Type", details?.editionType ? EDITION_LABELS[details.editionType] : EMPTY],
        ["Description", text(details?.description)],
    ];

    return (
        <ReviewCard number="1" title="Lot Details" onEdit={onEdit} canEdit={canEdit}>
            <DetailRows rows={rows} />
        </ReviewCard>
    );
};


const MAX_THUMBNAILS = 4;

const UploadImagesCard = ({ lotIndex, onEdit, canEdit }: CardProps) => {
    const { control } = useFormContext<AuctionFormData>();

    const media = useWatch({ control, name: `lots.${lotIndex}.images` }) ?? [];

    const primaryIndex = Math.max(
        media.findIndex((item) => item.isPrimary),
        0
    );
    const primary = media[primaryIndex];

    const others = media
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => index !== primaryIndex);

    const visible = others.slice(0, MAX_THUMBNAILS);
    const hiddenCount = others.length - visible.length;

    return (
        <ReviewCard number="2" title="Upload Images" onEdit={onEdit} canEdit={canEdit}>

            {!primary ? (
                <p className="text-xs text-slate-500">No images or videos uploaded.</p>
            ) : (
                <>
                    {/* PRIMARY IMAGE */}
                    <div className="flex items-center gap-3">

                        <MediaThumb
                            media={primary}
                            className="h-14 w-20"
                        />

                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-700">
                                {getMediaName(primary)}
                            </p>

                            {primary.isPrimary && (
                                <span className="
                                    mt-1
                                    inline-flex
                                    rounded-full
                                    bg-orange-50
                                    px-2
                                    py-0.5
                                    text-[9px]
                                    font-medium
                                    text-orange-600
                                ">
                                    Primary Artwork Cover
                                </span>
                            )}
                        </div>

                    </div>

                    {/* THUMBNAILS */}
                    {others.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">

                            {visible.map(({ item, index }) => (
                                <MediaThumb
                                    key={`${item.url ?? getMediaName(item)}-${index}`}
                                    media={item}
                                    className="h-9 w-12 border border-slate-200"
                                />
                            ))}

                            {hiddenCount > 0 && (
                                <div className="
                                    flex
                                    h-9
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-md
                                    bg-slate-100
                                    text-xs
                                    font-medium
                                    text-slate-500
                                ">
                                    +{hiddenCount}
                                </div>
                            )}

                        </div>
                    )}

                    <p className="mt-3 text-[11px] text-slate-500">
                        {media.filter(isImageMedia).length} image(s) · {media.filter(isVideoMedia).length} video(s)
                    </p>
                </>
            )}

        </ReviewCard>
    );
};

const MediaThumb = ({
    media,
    className,
}: {
    media: LotImageFile;
    className?: string;
}) => {
    const src = media.preview || media.url;

    return (
        <div className={`relative shrink-0 overflow-hidden rounded-md bg-slate-100 ${className ?? ""}`}>
            {src && isVideoMedia(media) ? (
                <>
                    <video src={src} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="h-3 w-3 text-white" fill="currentColor" />
                    </div>
                </>
            ) : src ? (
                <img
                    src={src}
                    alt={getMediaName(media)}
                    className="h-full w-full object-cover"
                />
            ) : null}
        </div>
    );
};


const PricingValuationCard = ({ lotIndex, onEdit, canEdit }: CardProps) => {
    const { control } = useFormContext<AuctionFormData>();
    const { currencies } = useCurrencies();

    const pricing = useWatch({ control, name: `lots.${lotIndex}.pricing` });

    const currencyCode = pricing?.currency ?? "";
    const currency = currencies.find((c) => c.code === currencyCode);
    const symbol = currency?.symbol ?? currencyCode;
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";

    const money = (value: number | null | undefined) =>
        hasNumber(value)
            ? `${symbol} ${value.toLocaleString(locale)}`.trim()
            : EMPTY;

    const estimate =
        hasNumber(pricing?.estimateFrom) || hasNumber(pricing?.estimateTo)
            ? `${money(pricing?.estimateFrom)} – ${money(pricing?.estimateTo)}`
            : EMPTY;

    const gst = hasNumber(pricing?.gstRate) ? `${pricing.gstRate}%` : EMPTY;

    const rows: [string, string][] = [
        ["Currency", currency ? `${currency.name} (${currency.code})` : text(currencyCode)],
        ["Starting Bid Price", money(pricing?.startingPrice)],
        ["Reserve Price", money(pricing?.reservePrice)],
        ["Minimum Price", money(pricing?.minimumPrice)],
        ["Estimated Range", estimate],
        ["Insurance Declared Value", money(pricing?.insuranceDeclaredValue)],
        ["GST Rate & HSN", `${gst} / ${text(pricing?.hsnCode)}`],
    ];

    return (
        <ReviewCard number="3" title="Pricing & Valuation" onEdit={onEdit} canEdit={canEdit}>
            <DetailRows rows={rows} />
        </ReviewCard>
    );
};


const ConditionProvenanceCard = ({ lotIndex, onEdit, canEdit }: CardProps) => {
    const { control } = useFormContext<AuctionFormData>();

    const condition = useWatch({ control, name: `lots.${lotIndex}.condition` });
    const provenance = useWatch({ control, name: `lots.${lotIndex}.provenance` });
    const authentication = useWatch({ control, name: `lots.${lotIndex}.authentication` });

    const rows: [string, string][] = [
        ["Overall Condition Class", text(condition?.overallCondition)],
        ["Frame Condition", text(condition?.frameCondition)],
        ["Condition Notes", text(condition?.detailedConditionNotes)],
        ["Restoration History", text(condition?.restorationHistory)],
        ["Previous Owner", text(provenance?.previousOwner)],
        ["Acquisition Method", titleCase(provenance?.acquisitionMethod)],
        ["Acquisition Date", formatDate(provenance?.acquisitionDate)],
        ["Exhibition History", text(provenance?.exhibitionHistory)],
        ["Authenticated By", text(authentication?.authenticatedBy)],
        ["Authentication Date", formatDate(authentication?.authenticatedDate)],
    ];

    return (
        <ReviewCard number="4" title="Condition & Provenance" onEdit={onEdit} canEdit={canEdit}>
            <DetailRows rows={rows} />
        </ReviewCard>
    );
};


const CertificatesDocsCard = ({ lotIndex, onEdit, canEdit }: CardProps) => {
    const { control } = useFormContext<AuctionFormData>();

    const documents = useWatch({ control, name: `lots.${lotIndex}.documents` }) ?? [];

    return (
        <ReviewCard number="5" title="Certificates & Docs" onEdit={onEdit} canEdit={canEdit}>

            {documents.length === 0 ? (
                <p className="text-xs text-slate-500">No documents uploaded.</p>
            ) : (
                <div className="flex flex-wrap gap-3">

                    {documents.map((document, index) => {
                        const name = getDocumentName(document);

                        return (
                            <div
                                key={`${document.fileUrl ?? name}-${index}`}
                                className="
                                    inline-flex
                                    items-start
                                    gap-2
                                    rounded-md
                                    bg-emerald-50
                                    px-3
                                    py-2.5
                                    text-[11px]
                                    font-medium
                                    text-emerald-600
                                    max-w-full
                                "
                            >

                                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />

                                <div className="min-w-0">
                                    <p>
                                        {DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType}
                                    </p>

                                    {document.fileUrl ? (
                                        <a
                                            href={document.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block truncate font-normal text-emerald-700 hover:underline"
                                        >
                                            {name}
                                        </a>
                                    ) : (
                                        <p className="truncate font-normal text-emerald-700">
                                            {name}
                                        </p>
                                    )}

                                    {document.description?.trim() && (
                                        <p className="font-normal text-slate-500">
                                            {document.description}
                                        </p>
                                    )}
                                </div>

                            </div>
                        );
                    })}

                </div>
            )}

        </ReviewCard>
    );
};
