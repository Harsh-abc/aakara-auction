"use client"

import * as React from "react"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
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
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UsersTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[],
    search: string
}

export function UsersTable<TData, TValue>({
    columns,
    data,
    search
}: UsersTableProps<TData, TValue>) {

    const [rowSelection, setRowSelection] = React.useState({})

    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 7,
    })

    const table = useReactTable({
        data,
        columns,

        state: {
            rowSelection,
            globalFilter: search,
            pagination,
        },

        enableRowSelection: true,

        onRowSelectionChange: setRowSelection,

        onPaginationChange: setPagination,

        getCoreRowModel: getCoreRowModel(),

        getFilteredRowModel: getFilteredRowModel(),

        getPaginationRowModel: getPaginationRowModel(),

        globalFilterFn: "includesString",
    })

    return (
        <div className="overflow-hidden rounded-lg border">
            <div>


                <Table className="">



                    <TableHeader className="bg-[#4141410F]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>

                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="h-11 text-xs font-medium text-slate-700"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef
                                                    .header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}

                            </TableRow>
                        ))}
                    </TableHeader>


                    <TableBody className="bg-white">

                        {table.getRowModel().rows?.length ? (

                            table.getRowModel().rows.map((row) => (

                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                    className="h-16"
                                >

                                    {row.getVisibleCells().map((cell) => (

                                        <TableCell
                                            key={cell.id}
                                            className="text-xs"
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
                                    No users found.
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

                <div className="flex items-center gap-1">

                    <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="ml-1 h-3 w-3" />
                        Back
                    </Button>

                    {Array.from(
                        { length: table.getPageCount() },
                        (_, index) => index
                    ).map((pageIndex) => (
                        <Button
                            key={pageIndex}
                            variant={
                                table.getState().pagination.pageIndex === pageIndex
                                    ? "default"
                                    : "outline"
                            }
                            size="icon"
                            className={
                                table.getState().pagination.pageIndex === pageIndex
                                    ? "h-7 w-7 bg-[#7b365d] hover:bg-[#672b4d] text-white text-xs"
                                    : "h-7 w-7 text-xs"
                            }
                            onClick={() => table.setPageIndex(pageIndex)}
                        >
                            {pageIndex + 1}
                        </Button>
                    ))}

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
                            table.setPageIndex(0)
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