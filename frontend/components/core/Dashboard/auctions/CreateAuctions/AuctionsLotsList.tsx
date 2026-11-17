"use client"

import * as React from "react"

import {
    ColumnDef,
    flexRender,
    Row,
    RowData,
    SortingState,
    ColumnFiltersState,
    useTable,
} from "@tanstack/react-table"
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, GripVertical, SearchIcon, X } from "lucide-react"

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

interface DataTableProps<TData extends RowData> {
    columns: ColumnDef<AppTableFeatures, TData>[]
    data: TData[]
    onAddLot?: () => void
    loading?: boolean
    /** Options for the status dropdown (first item should be { value: "all" }) */
    statusItems?: StatusFilterItem[]
    /** Optional summary shown under the toolbar, e.g. "3 lots · 1 needs attention" */
    summary?: React.ReactNode
    /**
     * Drag-to-reorder. Receives positions in the source array (row.original.index),
     * same semantics as useFieldArray's move(from, to). Rows need `key` + `index`.
     */
    onReorder?: (fromIndex: number, toIndex: number) => void
}

const DEFAULT_STATUS_ITEMS: StatusFilterItem[] = [
    { label: "Status : All", value: "all" },
    { label: "Ready", value: "READY" },
    { label: "Incomplete", value: "INCOMPLETE" },
]

type ReorderableRow = { key?: string; index?: number }

const rowKey = (row: unknown, i: number) => (row as ReorderableRow)?.key ?? String(i)
const rowIndex = (row: unknown) => (row as ReorderableRow)?.index ?? -1

/** One table row that can be dragged by its grip handle */
function SortableLotRow<TData extends RowData>({
    row,
    dragEnabled,
    dragHint,
}: {
    row: Row<AppTableFeatures, TData>
    dragEnabled: boolean
    dragHint: string
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: row.id, disabled: !dragEnabled })

    return (
        <TableRow
            ref={setNodeRef}
            data-state={row.getIsSelected() ? "selected" : undefined}
            data-dragging={isDragging}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`relative h-[58px] border-b border-slate-100 hover:bg-slate-50 transition-colors data-[dragging=true]:z-10 data-[dragging=true]:bg-white data-[dragging=true]:shadow-md ${row.getIsSelected() ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""
                }`}
        >
            <TableCell className="w-8 px-1 py-2">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    disabled={!dragEnabled}
                    title={dragHint}
                    className="flex h-7 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 touch-none"
                >
                    <GripVertical className="h-4 w-4" />
                    <span className="sr-only">Drag to reorder</span>
                </button>
            </TableCell>
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    )
}

export function AuctionLotsList<TData extends RowData>({
    columns,
    data,
    onAddLot,
    loading = false,
    statusItems = DEFAULT_STATUS_ITEMS,
    summary,
    onReorder,
}: DataTableProps<TData>) {

    const [sorting, setSorting] = React.useState<SortingState>([{ id: "lotNumber", desc: false }])
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")

    const columnFilters = React.useMemo<ColumnFiltersState>(
        () => (statusFilter === "all" ? [] : [{ id: "status", value: statusFilter }]),
        [statusFilter]
    )

    const table = useTable({
        features: appTableFeatures,
        data,
        columns,
        state: { sorting, columnFilters, rowSelection, globalFilter },
        getRowId: (row, i) => rowKey(row, i),
        enableRowSelection: true,
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        // Don't jump back to page 1 every time a lot's value changes
        autoResetPageIndex: false,
        initialState: { pagination: { pageIndex: 0, pageSize: 7 } },
    })

    // autoResetPageIndex is off, so go back to page 1 when the status filter changes
    const changeStatusFilter = (value: string) => {
        setStatusFilter(value)
        table.setPageIndex(0)
    }

    // If a delete leaves the current page empty, step back a page
    const pageCount = table.getPageCount()
    const { pageIndex, pageSize } = table.state.pagination
    React.useEffect(() => {
        if (pageIndex > 0 && pageIndex >= pageCount) table.setPageIndex(Math.max(0, pageCount - 1))
    }, [pageIndex, pageCount, table])

    const hasFilters = Boolean(globalFilter) || statusFilter !== "all"
    const totalRows = table.getFilteredRowModel().rows.length

    // ---------------- drag to reorder ----------------
    // Only when the table shows the real lot order: sorted by Lot ascending, no search / filter
    const sortedByLot = sorting.length === 0 || (sorting[0]?.id === "lotNumber" && !sorting[0]?.desc)
    const dragEnabled = Boolean(onReorder) && !hasFilters && sortedByLot
    const dragHint = dragEnabled
        ? "Drag to change the lot order"
        : "Clear search / filters and sort by Lot (ascending) to reorder"

    const sortableId = React.useId()
    const sensors = useSensors(
        // small distance so a click on the handle isn't treated as a drag
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const pageRows = table.getRowModel().rows
    const pageRowIds = React.useMemo(() => pageRows.map((r) => r.id), [pageRows])

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!onReorder || !over || active.id === over.id) return
        const from = pageRows.find((r) => r.id === active.id)
        const to = pageRows.find((r) => r.id === over.id)
        if (!from || !to) return
        const fromIndex = rowIndex(from.original)
        const toIndex = rowIndex(to.original)
        if (fromIndex < 0 || toIndex < 0) return
        onReorder(fromIndex, toIndex)
    }

    const extraCols = onReorder ? 1 : 0

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
                            onValueChange={(value) => changeStatusFilter((value as string) ?? "all")}
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
                                changeStatusFilter("all")
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
                <DndContext
                    id={sortableId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                >
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent bg-slate-50">
                                {onReorder && <TableHead className="h-9 w-8 px-1" aria-label="Reorder" />}
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
                                    {onReorder && <TableCell className="w-8 px-1" />}
                                    {columns.map((_, j) => (
                                        <TableCell key={j} className="px-3 py-2">
                                            <div className="h-3 w-full max-w-[110px] animate-pulse rounded bg-slate-100" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : pageRows.length && onReorder ? (
                            <SortableContext items={pageRowIds} strategy={verticalListSortingStrategy}>
                                {pageRows.map((row) => (
                                    <SortableLotRow
                                        key={row.id}
                                        row={row}
                                        dragEnabled={dragEnabled}
                                        dragHint={dragHint}
                                    />
                                ))}
                            </SortableContext>
                        ) : pageRows.length ? (
                            pageRows.map((row) => (
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
                                <TableCell colSpan={columns.length + extraCols} className="h-24 text-center text-slate-500">
                                    {hasFilters ? "No lots match these filters." : "No lots found."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </DndContext>
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
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}