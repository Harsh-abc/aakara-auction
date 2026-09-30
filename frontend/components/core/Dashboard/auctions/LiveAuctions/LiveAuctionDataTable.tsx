"use client"

import * as React from "react"

import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    SortingState,
    ColumnFiltersState,
    FilterFn,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"

import { ChevronLeft, ChevronRight, SearchIcon, X } from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"
import { Field } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"

import type { AuctionLot } from "@/lib/types/auction.types"
import { columns } from "./LiveAuctionsColumns"
import DashboardFormText from "@/components/common/DashboardFormText"

interface LiveAuctionDataTableProps {
    data: AuctionLot[]
    loading?: boolean
}

// Values must match the backend LotStatus enum
const statusItems = [
    { label: "Status : All", value: "all" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Active", value: "ACTIVE" },
    { label: "Sold", value: "SOLD" },
    { label: "Unsold", value: "UNSOLD" },
    { label: "Passed", value: "PASSED" },
    { label: "Withdrawn", value: "WITHDRAWN" },
]

/** Search matches lot number, title or artist */
const lotSearch: FilterFn<AuctionLot> = (row, _columnId, value: string) => {
    const q = value.trim().toLowerCase()
    if (!q) return true
    const lot = row.original
    return (
        String(lot.itemNumber).toLowerCase().includes(q) ||
        (lot.title ?? "").toLowerCase().includes(q) ||
        (lot.artistName ?? "").toLowerCase().includes(q)
    )
}

/** Page buttons: 1 … 4 [5] 6 … 12 */
const getPageNumbers = (current: number, total: number): (number | "ellipsis")[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i)

    const pages: (number | "ellipsis")[] = [0]
    const start = Math.max(1, current - 1)
    const end = Math.min(total - 2, current + 1)

    if (start > 1) pages.push("ellipsis")
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < total - 2) pages.push("ellipsis")

    pages.push(total - 1)
    return pages
}

export function LiveAuctionDataTable({ data, loading = false }: LiveAuctionDataTableProps) {

    const [sorting, setSorting] =
        React.useState<SortingState>([{ id: "lot", desc: false }])

    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])

    const [globalFilter, setGlobalFilter] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")

    const table = useReactTable({
        data,
        columns,

        state: {
            sorting,
            columnFilters,
            globalFilter,
        },

        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: lotSearch,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),

        initialState: {
            pagination: {
                pageIndex: 0,
                pageSize: 7,
            },
        },
    })

    // ---------- push toolbar values into column filters ----------
    React.useEffect(() => {
        setColumnFilters((prev) => {
            const rest = prev.filter((f) => f.id !== "status")
            return statusFilter === "all" ? rest : [...rest, { id: "status", value: statusFilter }]
        })
    }, [statusFilter])

    const hasFilters = Boolean(globalFilter) || statusFilter !== "all"

    const clearFilters = () => {
        setGlobalFilter("")
        setStatusFilter("all")
    }

    const { pageIndex, pageSize } = table.getState().pagination
    const pageCount = table.getPageCount()
    const totalRows = table.getFilteredRowModel().rows.length

    return (
        <div className="w-full  px-3  pb-4">


            {/* ================= TOOLBAR ================= */}
            <div className="pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-87.5 h-10">
                    <Field className="max-w-sm">
                        <InputGroup className="bg-white">
                            <InputGroupInput
                                id="live-lot-search"
                                placeholder="Search lots or artists..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                            <InputGroupAddon align="inline-start">
                                <SearchIcon className="text-muted-foreground" />
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                </div>

                <div className="flex items-center gap-4">

                    {/* Status */}
                    <Field className="w-34 py-4">
                        <Select
                            items={statusItems}
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter((value as string) ?? "all")}
                        >
                            <SelectTrigger className="w-full max-w-48 bg-white text-slate-500 border-slate-200 shadow-none">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="bg-white">
                                <SelectGroup>
                                    <SelectLabel className="text-slate-500">Status</SelectLabel>
                                    {statusItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value} className="text-slate-700">
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    {hasFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-2 text-xs text-slate-500"
                            onClick={clearFilters}
                        >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                <Table className="w-full table-fixed">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent bg-slate-50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        style={{ width: header.getSize() }}
                                        className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-normal"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            // Skeleton rows
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="h-13.5 border-b border-slate-100">
                                    {columns.map((_, j) => (
                                        <TableCell key={j} className="px-3 py-2 whitespace-normal wrap-break-word">
                                            <div className="h-3 w-full max-w-27.5 animate-pulse rounded bg-slate-100" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="h-13.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-3 py-2">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                                    {hasFilters ? "No lots match these filters." : "No lots found."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ================= FOOTER ================= */}
            <div className="flex items-center justify-between border-x border-b border-slate-200 bg-white px-3 py-2 rounded-b-md">

                {/* Pagination */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-3 w-3" />
                        Back
                    </Button>

                    {getPageNumbers(pageIndex, pageCount).map((page, i) =>
                        page === "ellipsis" ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">
                                ...
                            </span>
                        ) : (
                            <Button
                                key={page}
                                variant={page === pageIndex ? "default" : "outline"}
                                size="icon"
                                onClick={() => table.setPageIndex(page)}
                                className={
                                    page === pageIndex
                                        ? "h-7 w-7 bg-[#7b365d] hover:bg-[#672b4d] text-white text-xs"
                                        : "h-7 w-7 text-xs"
                                }
                            >
                                {page + 1}
                            </Button>
                        )
                    )}

                    <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>

                {/* Counts */}
                <span className="text-[11px] text-slate-500">
                    {totalRows === 0
                        ? "0 results"
                        : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
                </span>

                {/* Result per page */}
                <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-black">Result per page</span>

                    <Select
                        value={`${pageSize}`}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger className="h-7 w-16.25 bg-white text-xs">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent className="bg-white">
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
