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

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    SearchIcon,
} from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group"

import { CalendarIcon } from "lucide-react"
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
}

export function AuctionDataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] =
        React.useState<SortingState>([])

    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])

    const [rowSelection, setRowSelection] =
        React.useState({})

    const table = useReactTable({
        data,
        columns,

        state: {
            sorting,
            columnFilters,
            rowSelection,
        },

        enableRowSelection: true,

        onSortingChange: setSorting,

        onColumnFiltersChange: setColumnFilters,

        onRowSelectionChange: setRowSelection,

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
                                <SelectValue placeholder="Status : All" />
                            </SelectTrigger>

                            <SelectContent className="bg-white">
                                <SelectGroup>
                                    <SelectLabel className="text-slate-500">
                                        Status
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
                                <SelectValue placeholder="Status : All" />
                            </SelectTrigger>

                            <SelectContent className="bg-white">
                                <SelectGroup>
                                    <SelectLabel className="text-slate-500">
                                        Status
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


                    <Field className="w-34">

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

                                    <PopoverContent
                                        className="w-auto overflow-hidden p-0"
                                        align="end"
                                    >
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

                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">

                <Table>

                    {/* HEADER */}

                    <TableHeader>

                        {table.getHeaderGroups().map((headerGroup) => (

                            <TableRow
                                key={headerGroup.id}
                                className="hover:bg-transparent bg-slate-50"
                            >

                                {headerGroup.headers.map((header) => (

                                    <TableHead
                                        key={header.id}
                                        className="
                      h-9
                      px-3
                      text-[11px]
                      font-medium
                      text-slate-700
                      whitespace-nowrap
                    "
                                    >

                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}

                                    </TableHead>

                                ))}

                            </TableRow>

                        ))}

                    </TableHeader>

                    {/* BODY */}

                    <TableBody>

                        {table.getRowModel().rows?.length ? (

                            table.getRowModel().rows.map((row) => (

                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected()
                                            ? "selected"
                                            : undefined
                                    }
                                    className={`
                    h-[54px]
                    border-b
                    border-slate-100
                    hover:bg-slate-50
                    transition-colors

                    ${row.getIsSelected()
                                            ? "bg-blue-50 ring-2 ring-inset ring-blue-500"
                                            : ""
                                        }
                  `}
                                >

                                    {row.getVisibleCells().map((cell) => (

                                        <TableCell
                                            key={cell.id}
                                            className="px-3 py-2"
                                        >

                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}

                                        </TableCell>

                                    ))}

                                </TableRow>

                            ))

                        ) : (

                            <TableRow>

                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No auctions found.
                                </TableCell>

                            </TableRow>

                        )}

                    </TableBody>

                </Table>

            </div>


            <div
                className="
        flex
        items-center
        justify-between
        border-x
        border-b
        border-slate-200
        bg-white
        px-3
        py-2
        rounded-b-md
    "
            >

                <div className="flex items-center gap-1 justify-self-start">

                    <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="ml-1 h-3 w-3" />
                        Back
                    </Button>

                    <Button
                        variant="default"
                        size="icon"
                        className="
                h-7 w-7
                bg-[#7b365d]
                hover:bg-[#672b4d]
                text-white
                text-xs
            "
                    >
                        {table.getState().pagination.pageIndex + 1}
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs"
                    >
                        2
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs"
                    >
                        3
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs"
                    >
                        4
                    </Button>

                    <span className="px-1 text-xs text-slate-400">
                        ...
                    </span>

                    <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                        <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>

                {/* Center - Result per page */}
                <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-black">
                        Result per page
                    </span>

                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
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

