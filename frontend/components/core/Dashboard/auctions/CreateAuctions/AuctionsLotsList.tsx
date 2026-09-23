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

export interface StatusFilterItem {
    label: string
    value: string
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onAddLot?: () => void
    loading?: boolean
    /** Options for the status dropdown (first item should be { value: "all" }) */
    statusItems?: StatusFilterItem[]
    /** Optional summary shown under the toolbar, e.g. "3 lots · 1 needs attention" */
    summary?: React.ReactNode
}

const DEFAULT_STATUS_ITEMS: StatusFilterItem[] = [
    { label: "Status : All", value: "all" },
    { label: "Ready", value: "READY" },
    { label: "Incomplete", value: "INCOMPLETE" },
]

export function AuctionLotsList<TData, TValue>({
    columns,
    data,
    onAddLot,
    loading = false,
    statusItems = DEFAULT_STATUS_ITEMS,
    summary,
}: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] = React.useState<SortingState>([{ id: "lotNumber", desc: false }])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters, rowSelection, globalFilter },
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
        // Don't jump back to page 1 every time a lot's value changes
        autoResetPageIndex: false,
        initialState: { pagination: { pageIndex: 0, pageSize: 7 } },
    })

    React.useEffect(() => {
        setColumnFilters((prev) => {
            const rest = prev.filter((f) => f.id !== "status")
            return statusFilter === "all" ? rest : [...rest, { id: "status", value: statusFilter }]
        })
        table.setPageIndex(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter])

    // If a delete leaves the current page empty, step back a page
    const pageCount = table.getPageCount()
    const { pageIndex, pageSize } = table.getState().pagination
    React.useEffect(() => {
        if (pageIndex > 0 && pageIndex >= pageCount) table.setPageIndex(Math.max(0, pageCount - 1))
    }, [pageIndex, pageCount, table])

    const hasFilters = Boolean(globalFilter) || statusFilter !== "all"
    const totalRows = table.getFilteredRowModel().rows.length

    return (
        <div className="w-full bg-[#F4F4F4] px-3 rounded-[8px] min-h-[500px] flex flex-col">

            {/* ================= TOOLBAR ================= */}
            <div className="pb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-87.5 h-10">
                    <Field className="max-w-sm">
                        <InputGroup className="bg-white">
                            <InputGroupInput
                                placeholder="Search title, artist, medium..."
                                value={globalFilter}
                                onChange={(e) => {
                                    setGlobalFilter(e.target.value)
                                    table.setPageIndex(0)
                                }}
                            />
                            <InputGroupAddon align="inline-start">
                                <SearchIcon className="text-muted-foreground" />
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                </div>

                <div className="flex items-center gap-4">
                    <Field className="w-40 py-4">
                        <Select
                            items={statusItems}
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter((value as string) ?? "all")}
                        >
                            <SelectTrigger className="w-full bg-white text-slate-500 border-slate-200 shadow-none">
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
                            onClick={() => {
                                setGlobalFilter("")
                                setStatusFilter("all")
                            }}
                        >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Clear
                        </Button>
                    )}

                    {onAddLot && (
                        <button
                            onClick={onAddLot}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#DB9F49]"
                        >
                            <span className="text-[18px] leading-none">+</span>
                            Add New Lot
                        </button>
                    )}
                </div>
            </div>

            {summary && <div className="pb-3 text-[12px] text-slate-500">{summary}</div>}

            {/* ================= TABLE ================= */}
            <div className="flex-1 overflow-auto rounded-t-md border border-slate-200 bg-white">
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
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="h-[58px]">
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
                                    className={`h-[58px] border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.getIsSelected() ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""
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
                                    {hasFilters ? "No lots match these filters." : "No lots found."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ================= FOOTER ================= */}
            <div className="shrink-0 flex items-center justify-between border-x border-b border-slate-200 bg-white px-4 py-2 rounded-b-md min-h-[48px] mb-3">
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

                    {Array.from({ length: pageCount }, (_, index) => (
                        <Button
                            key={index}
                            variant={pageIndex === index ? "default" : "outline"}
                            size="icon"
                            className={
                                pageIndex === index
                                    ? "h-7 w-7 bg-[#7b365d] hover:bg-[#672b4d] text-white text-xs"
                                    : "h-7 w-7 text-xs"
                            }
                            onClick={() => table.setPageIndex(index)}
                        >
                            {index + 1}
                        </Button>
                    ))}

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

                <span className="text-[11px] text-slate-500">
                    {totalRows === 0
                        ? "0 lots"
                        : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
                </span>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-black whitespace-nowrap">Result per page</span>
                    <Select value={`${pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
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