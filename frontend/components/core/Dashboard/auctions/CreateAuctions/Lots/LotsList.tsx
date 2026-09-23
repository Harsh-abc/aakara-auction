"use client";

import React from "react";
import { useWatch, useFormContext } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch, RootState } from "@/redux/store";
import { getLotsByAuction } from "@/services/operations/auction.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AuctionLotsList as AuctionLotsDataTable } from "../AuctionsLotsList";
import { getColumns } from "../../AuctionsLotsColumns";

import { AuctionFormData, AuctionLotForm } from "@/lib/types/AuctionsFormData";
import { fromApiLot, fromFormLot, LotRow } from "@/lib/types/LotRow"

// =====================================================================
// PROPS
// =====================================================================

interface LotsListProps {
    /** When set, shows SAVED lots from the API (read-only view page). */
    auctionUuid?: string;

    /** Field-array entries from useFieldArray (only `id` is used — values come from useWatch). */
    lots?: (AuctionLotForm & { id: string })[];

    onAddLot?: () => void;
    onSelectLot?: (index: number) => void;
    onRemoveLot?: (index: number) => void;
    /** Opens the lot on its Review step */
    onViewLot?: (index: number) => void;
}

export default function LotsList(props: LotsListProps) {
    // Two separate components so the API view doesn't need a <FormProvider>
    return props.auctionUuid ? (
        <SavedLotsList auctionUuid={props.auctionUuid} />
    ) : (
        <FormLotsList {...props} />
    );
}

// =====================================================================
// LOTS BEING BUILT IN THE CREATE FORM
// =====================================================================

function FormLotsList({
    lots: fields = [],
    onAddLot,
    onSelectLot,
    onRemoveLot,
    onViewLot,
}: LotsListProps) {
    const { control } = useFormContext<AuctionFormData>();

    // LIVE values — `fields` from useFieldArray is only a snapshot taken
    // when the lot was appended (all empty), which is why data was missing.
    const liveLots = useWatch({ control, name: "lots" });
    const auctionCurrency = useWatch({ control, name: "basicInfo.currency" })?.[0] ?? "INR";

    const rows: LotRow[] = React.useMemo(
        () =>
            fields.map((field, index) =>
                fromFormLot(liveLots?.[index], index, field.id, auctionCurrency)
            ),
        [fields, liveLots, auctionCurrency]
    );

    const columns = React.useMemo(
        () =>
            getColumns({
                onEdit: onSelectLot,
                onView: onViewLot ?? onSelectLot,
                onDelete: onRemoveLot
                    ? (index) => {
                        const title = rows[index]?.title || `Lot ${index + 1}`;
                        if (window.confirm(`Remove "${title}" from this auction?`)) {
                            onRemoveLot(index);
                        }
                    }
                    : undefined,
            }),
        [onSelectLot, onViewLot, onRemoveLot, rows]
    );

    if (rows.length === 0) {
        return <EmptyLots onAddLot={onAddLot} />;
    }

    const incomplete = rows.filter((r) => r.missing.length > 0).length;
    const summary = (
        <>
            <b className="text-slate-700">{rows.length}</b> lot{rows.length === 1 ? "" : "s"}
            {incomplete > 0 ? (
                <span className="text-amber-600"> · {incomplete} need{incomplete === 1 ? "s" : ""} attention before publishing</span>
            ) : (
                <span className="text-emerald-600"> · all ready to publish</span>
            )}
        </>
    );

    return (
        <AuctionLotsDataTable
            columns={columns}
            data={rows}
            onAddLot={onAddLot}
            summary={summary}
        />
    );
}

// =====================================================================
// SAVED LOTS (from the API) — read-only
// =====================================================================

const API_STATUS_ITEMS = [
    { label: "Status : All", value: "all" },
    { label: "Draft", value: "DRAFT" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Active", value: "ACTIVE" },
    { label: "Sold", value: "SOLD" },
    { label: "Unsold", value: "UNSOLD" },
    { label: "Passed", value: "PASSED" },
    { label: "Withdrawn", value: "WITHDRAWN" },
];

function SavedLotsList({ auctionUuid }: { auctionUuid: string }) {
    const dispatch = useDispatch<AppDispatch>();
    const { lots, lotsLoading, lotsError } = useSelector((state: RootState) => state.auction);

    React.useEffect(() => {
        dispatch(getLotsByAuction({ auctionUuid }));
    }, [auctionUuid, dispatch]);

    const rows = React.useMemo(() => lots.map(fromApiLot), [lots]);
    const columns = React.useMemo(() => getColumns({}), []);

    if (lotsError) {
        return <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{lotsError}</div>;
    }

    return (
        <AuctionLotsDataTable
            columns={columns}
            data={rows}
            loading={lotsLoading && rows.length === 0}
            statusItems={API_STATUS_ITEMS}
        />
    );
}

// =====================================================================
// EMPTY STATE (your original design)
// =====================================================================

function EmptyLots({ onAddLot }: { onAddLot?: () => void }) {
    const headers = ["Lot", "Artwork", "Medium / Edition", "Media", "Starting Bid", "Reserve", "Estimate", "Status"];

    return (
        <div className="w-full bg-[#F4F4F4] px-3 py-4 rounded-[8px]">
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-slate-50">
                            {headers.map((h) => (
                                <TableHead key={h} className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={headers.length} className="h-[280px] p-0">
                                <div className="flex h-full flex-col items-center justify-center text-center">
                                    <div className="mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-slate-100">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="28"
                                            height="28"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-slate-400"
                                        >
                                            <path d="m21 16-9 5-9-5" />
                                            <path d="M3 8 12 3l9 5-9 5-9-5Z" />
                                            <path d="M12 13v8" />
                                            <path d="m7.5 5.5 9 5" />
                                        </svg>
                                    </div>

                                    <h3 className="text-[18px] font-semibold text-[#1E293B]">No lots yet</h3>

                                    <p className="mt-2 max-w-[390px] text-[14px] leading-5 text-[#64748B]">
                                        Add the artworks going under the hammer in this auction.
                                        <br />
                                        Each lot needs a title, starting bid and at least one image to publish.
                                    </p>

                                    {onAddLot && (
                                        <button
                                            onClick={onAddLot}
                                            type="button"
                                            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#DB9F49]"
                                        >
                                            <span className="text-[18px] leading-none">+</span>
                                            Add New Lot
                                        </button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}