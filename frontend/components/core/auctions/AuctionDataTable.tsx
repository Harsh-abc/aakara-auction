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
} from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

    return (
        <div className="w-full">

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

            {/* PAGINATION */}

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

                {/* LEFT */}

                <div className="text-[11px] text-slate-500">

                    {table.getState().pagination.pageIndex *
                        table.getState().pagination.pageSize +
                        1}

                    -

                    {Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                        data.length
                    )}

                    {" "}of{" "}

                    {data.length.toLocaleString()}

                </div>

                {/* CENTER PAGINATION */}

                <div className="flex items-center gap-1">

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="default"
                        size="icon"
                        className="
              h-7
              w-7
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

                {/* RIGHT */}

                <div className="flex items-center gap-2">

                    <span className="text-[11px] text-slate-500">
                        Result per page
                    </span>

                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >

                        <SelectTrigger className="h-7 w-[65px] text-xs">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>

                            <SelectItem value="7">
                                7
                            </SelectItem>

                            <SelectItem value="10">
                                10
                            </SelectItem>

                            <SelectItem value="25">
                                25
                            </SelectItem>

                            <SelectItem value="50">
                                50
                            </SelectItem>

                        </SelectContent>

                    </Select>

                </div>

            </div>

        </div>
    )
}