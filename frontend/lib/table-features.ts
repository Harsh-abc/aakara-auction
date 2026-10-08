import {
    columnFilteringFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFns,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFns,
    tableFeatures,
} from "@tanstack/react-table"

/**
 * TanStack Table v9 feature set shared by the dashboard tables.
 * Column defs and tables must use the same `features` so their types line up:
 * `ColumnDef<AppTableFeatures, Row>`.
 */
export const appTableFeatures = tableFeatures({
    columnFilteringFeature,
    globalFilteringFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortedRowModel: createSortedRowModel(),
    // Built-in registries, so string names like "equals" / "includesString" /
    // "datetime" and "auto" resolve as they did in v8
    filterFns,
    sortFns,
})

export type AppTableFeatures = typeof appTableFeatures
