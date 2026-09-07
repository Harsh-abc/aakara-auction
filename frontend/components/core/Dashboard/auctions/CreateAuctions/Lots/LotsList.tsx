"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnFiltersState, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { CalendarIcon, ChevronLeft, ChevronRight, SearchIcon } from "lucide-react";
import React from "react";
import { DateRange } from "react-day-picker";

type LotsListProps = {
    lots: any[];
    onAddLot: () => void;
    onSelectLot: (index: number) => void;
    onRemoveLot: (index: number) => void;
};

export default function LotsList({
    lots,
    onAddLot,
    onSelectLot,
    onRemoveLot,

}: LotsListProps) {


    const items = [
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Scheduled", value: "scheduled" },
    ]

    const [open, setOpen] = React.useState(false)

    const [range, setRange] = React.useState<DateRange | undefined>()

    const formatRange = () => {
        if (!range?.from) return ""

        const from = range.from.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })

        if (!range.to) return from

        const to = range.to.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })

        return `${from} - ${to}`
    }
    return (
        <div>

            {lots.length === 0 ? (
                <div className="w-full bg-[#F4F4F4] px-3 rounded-[8px] pb-4">

                    <div className="pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 w-87.5 h-10">
                            <Field className="max-w-sm">
                                <InputGroup className="bg-white">
                                    <InputGroupInput id="inline-start-input" placeholder="Search auctions..." />
                                    <InputGroupAddon align="inline-start">
                                        <SearchIcon className="text-muted-foreground" />
                                    </InputGroupAddon>
                                </InputGroup>
                            </Field>
                        </div>
                        <div className="flex items-center gap-4">
                            <Field className="w-34 py-4">
                                <Select items={items}>
                                    <SelectTrigger
                                        className="
                w-full max-w-48
                bg-white
                text-slate-500
                border-slate-200
                shadow-none
            "
                                    >
                                        <SelectValue placeholder="Category : All" />
                                    </SelectTrigger>

                                    <SelectContent className="bg-white">
                                        <SelectGroup>
                                            <SelectLabel className="text-slate-500">
                                                Category
                                            </SelectLabel>

                                            {items.map((item) => (
                                                <SelectItem
                                                    key={item.value}
                                                    value={item.value}
                                                    className="text-slate-700"
                                                >
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            {/* <Field className="w-34 py-4">
                                <Select items={items}>
                                    <SelectTrigger
                                        className="
                w-full max-w-48
                bg-white
                text-slate-500
                border-slate-200
                shadow-none
            "
                                    >
                                        <SelectValue placeholder="Status : All" />
                                    </SelectTrigger>

                                    <SelectContent className="bg-white">
                                        <SelectGroup>
                                            <SelectLabel className="text-slate-500">
                                                Bulck
                                            </SelectLabel>

                                            {items.map((item) => (
                                                <SelectItem
                                                    key={item.value}
                                                    value={item.value}
                                                    className="text-slate-700"
                                                >
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field> */}

                        </div>
                    </div>

                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">

                        <Table>

                            <TableHeader>
                                <TableRow
                                    className="hover:bg-transparent bg-slate-50"
                                >
                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Order
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Image
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Artwork
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Artist
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Artwork ID
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Category
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Starting Bid
                                    </TableHead>

                                    <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                                        Reserve Price
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={8}
                                        className="h-[280px] p-0"
                                    >
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

                                            <h3 className="text-[18px] font-semibold text-[#1E293B]">
                                                No data available
                                            </h3>

                                            <p className="mt-2 max-w-[390px] text-[14px] leading-5 text-[#64748B]">
                                                There are no records to display right now. Once data is added,
                                                <br />
                                                it will appear here.
                                            </p>

                                            <button
                                                onClick={onAddLot}
                                                type="button"
                                                className="
                        mt-5
                        inline-flex
                        items-center
                        gap-2
                        rounded-md
                        bg-[#F59E0B]
                        px-4
                        py-2.5
                        text-[14px]
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-[#DB9F49]
                    "
                                            >
                                                <span className="text-[18px] leading-none">
                                                    +
                                                </span>

                                                Add New Lot
                                            </button>

                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>

                        </Table>

                    </div>


                </div>
            ) : (
                <div className="space-y-4">

                    <div className="flex justify-between items-center">

                        <h2 className="text-lg font-semibold">
                            Auction Lots
                        </h2>

                        <button
                            type="button"
                            onClick={onAddLot}
                            className="bg-black text-white px-4 py-2 rounded-md"
                        >
                            + Add New Lot
                        </button>

                    </div>

                    {lots.map((lot, index) => (

                        <div
                            key={lot.id}
                            className="border rounded-lg p-4 flex justify-between"
                        >

                            <div>
                                <p className="font-medium">
                                    Lot {index + 1}
                                </p>

                                <p className="text-sm text-gray-500">
                                    {lot.details?.title ||
                                        "Untitled Artwork"}
                                </p>
                            </div>

                            <div className="flex gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        onSelectLot(index)
                                    }
                                    className="border px-3 py-1 rounded-md"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemoveLot(index)
                                    }
                                    className="border px-3 py-1 rounded-md text-red-500"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    ))}

                </div>
            )}

        </div>
    );
}