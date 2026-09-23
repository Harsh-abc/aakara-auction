"use client"

import * as React from "react"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    SortingState,
    ColumnFiltersState,
    TableMeta,
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

import {
    ChevronLeft,
    ChevronRight,
    SearchIcon,
    CalendarIcon,
    X,
} from "lucide-react"

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
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group"

import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    loading?: boolean
    /** Row action handlers (onEdit / onView / onDelete) read by the Actions column */
    meta?: TableMeta<TData>
}

// Values must match the backend enums (AuctionStatus / AuctionType)
const statusItems = [
    { label: "Status : All", value: "all" },
    { label: "Draft", value: "DRAFT" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Preview", value: "PREVIEW" },
    { label: "Live", value: "LIVE" },
    { label: "Paused", value: "PAUSED" },
    { label: "Ended", value: "ENDED" },
    { label: "Settled", value: "SETTLED" },
    { label: "Cancelled", value: "CANCELLED" },
]

const typeItems = [
    { label: "Type : All", value: "all" },
    { label: "Live", value: "LIVE" },
    { label: "Floor", value: "FLOOR" },
    { label: "Hybrid", value: "HYBRID" },
]

const formatShort = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

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

export function AuctionDataTable<TData, TValue>({
    columns,
    data,
    loading = false,
    meta,
}: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] =
        React.useState<SortingState>([{ id: "startTime", desc: true }])

    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])

    const [rowSelection, setRowSelection] =
        React.useState({})

    const [globalFilter, setGlobalFilter] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [typeFilter, setTypeFilter] = React.useState("all")

    const [open, setOpen] = React.useState(false)
    const [range, setRange] = React.useState<DateRange | undefined>()

    const table = useReactTable({
        data,
        columns,
        meta,

        state: {
            sorting,
            columnFilters,
            rowSelection,
            globalFilter,
        },

        enableRowSelection: true,

        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",

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
    const applyColumnFilter = React.useCallback(
        (id: string, value: unknown) => {
            setColumnFilters((prev) => {
                const rest = prev.filter((f) => f.id !== id)
                return value === undefined ? rest : [...rest, { id, value }]
            })
        },
        []
    )

    React.useEffect(() => {
        applyColumnFilter("status", statusFilter === "all" ? undefined : statusFilter)
    }, [statusFilter, applyColumnFilter])

    React.useEffect(() => {
        applyColumnFilter("auctionType", typeFilter === "all" ? undefined : typeFilter)
    }, [typeFilter, applyColumnFilter])

    React.useEffect(() => {
        applyColumnFilter("startTime", range?.from ? range : undefined)
    }, [range, applyColumnFilter])

    const formatRange = () => {
        if (!range?.from) return ""
        if (!range.to) return formatShort(range.from)
        return `${formatShort(range.from)} - ${formatShort(range.to)}`
    }

    const hasFilters =
        Boolean(globalFilter) || statusFilter !== "all" || typeFilter !== "all" || Boolean(range?.from)

    const clearFilters = () => {
        setGlobalFilter("")
        setStatusFilter("all")
        setTypeFilter("all")
        setRange(undefined)
    }

    const { pageIndex, pageSize } = table.getState().pagination
    const pageCount = table.getPageCount()
    const totalRows = table.getFilteredRowModel().rows.length
    const selectedCount = table.getFilteredSelectedRowModel().rows.length

    return (
        <div className="w-full bg-[#F4F4F4] px-3 rounded-[8px] pb-4">

            {/* ================= TOOLBAR ================= */}
            <div className="pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-87.5 h-10">
                    <Field className="max-w-sm">
                        <InputGroup className="bg-white">
                            <InputGroupInput
                                id="auction-search"
                                placeholder="Search auctions..."
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

                    {/* Auction Type (was a duplicate Status select) */}
                    <Field className="w-34 py-4">
                        <Select
                            items={typeItems}
                            value={typeFilter}
                            onValueChange={(value) => setTypeFilter((value as string) ?? "all")}
                        >
                            <SelectTrigger className="w-full max-w-48 bg-white text-slate-500 border-slate-200 shadow-none">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="bg-white">
                                <SelectGroup>
                                    <SelectLabel className="text-slate-500">Auction Type</SelectLabel>
                                    {typeItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value} className="text-slate-700">
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    {/* Start date range */}
                    <Field className="w-56">
                        <InputGroup className="bg-white py-4">
                            <InputGroupInput
                                readOnly
                                value={formatRange()}
                                placeholder="Date Range"
                                onClick={() => setOpen(true)}
                            />

                            <InputGroupAddon align="inline-end">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger
                                        render={
                                            <InputGroupButton
                                                variant="ghost"
                                                size="icon-xs"
                                                aria-label="Select date range"
                                            >
                                                <CalendarIcon />
                                            </InputGroupButton>
                                        }
                                    />

                                    <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                                        <Calendar
                                            mode="range"
                                            selected={range}
                                            onSelect={(selectedRange) => {
                                                setRange(selectedRange)
                                                if (selectedRange?.from && selectedRange?.to) {
                                                    setOpen(false)
                                                }
                                            }}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </InputGroupAddon>
                        </InputGroup>
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
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent bg-slate-50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="h-9 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap"
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
                                <TableRow key={`skeleton-${i}`} className="h-[54px] border-b border-slate-100">
                                    {columns.map((_, j) => (
                                        <TableCell key={j} className="px-3 py-2">
                                            <div className="h-3 w-full max-w-[110px] animate-pulse rounded bg-slate-100" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                    className={`h-[54px] border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.getIsSelected() ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""
                                        }`}
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
                                    {hasFilters ? "No auctions match these filters." : "No auctions found."}
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
                    {selectedCount > 0 && `${selectedCount} selected · `}
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
                        <SelectTrigger className="h-7 w-[65px] bg-white text-xs">
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