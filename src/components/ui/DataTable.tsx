import React, { useState, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu'

export interface Column<T> {
  key: string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField?: keyof T | ((row: T) => string)
  loading?: boolean
  emptyMessage?: string
  emptyTitle?: string
  emptyAction?: {
    label: string
    onClick: () => void
  }
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => DropdownMenuItem[]
  selectable?: boolean
  selectedKeys?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
  bulkActions?: React.ReactNode
  pageSize?: number
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  emptyTitle = 'No records found',
  emptyAction,
  onRowClick,
  rowActions,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((c) => c.key)
  )

  const getKey = (row: T, index: number): string => {
    if (typeof keyField === 'function') return keyField(row)
    if (row && keyField in row) return String(row[keyField])
    return String(index)
  }

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data

    return [...data].sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toString().toLowerCase()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortOrder])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortKey(null)
        setSortOrder('asc')
      }
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    const currentPageKeys = paginatedData.map((row, idx) => getKey(row, idx))
    const allSelected = currentPageKeys.every((k) => selectedKeys.includes(k))

    if (allSelected) {
      onSelectionChange(selectedKeys.filter((k) => !currentPageKeys.includes(k)))
    } else {
      const merged = Array.from(new Set([...selectedKeys, ...currentPageKeys]))
      onSelectionChange(merged)
    }
  }

  const toggleSelectRow = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onSelectionChange) return
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key))
    } else {
      onSelectionChange([...selectedKeys, key])
    }
  }

  const activeColumns = columns.filter((c) => visibleColumns.includes(c.key))

  return (
    <div className={cn('w-full flex flex-col space-y-3', className)}>
      {/* Top Toolbar: Bulk selection bar & Column Visibility */}
      <div className="flex items-center justify-between gap-2 min-h-[38px]">
        <div>
          {selectable && selectedKeys.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-md bg-primary-50 dark:bg-primary-950/60 px-3 py-1.5 text-xs text-primary-900 dark:text-primary-200 border border-primary-200 dark:border-primary-800">
              <span className="font-semibold">{selectedKeys.length} selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary-700 dark:text-primary-300"
                onClick={() => onSelectionChange?.([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Menu */}
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Columns
              </Button>
            }
            items={columns.map((col) => ({
              label: `${visibleColumns.includes(col.key) ? '✓ ' : '   '}${col.header}`,
              onClick: () => {
                if (visibleColumns.includes(col.key)) {
                  if (visibleColumns.length > 1) {
                    setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                  }
                } else {
                  setVisibleColumns([...visibleColumns, col.key])
                }
              },
            }))}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-card border border-[#cdd8c3] bg-[#fbfbf4] shadow-card dark:border-[#3a5145] dark:bg-[#1a2922]">
        <table className="w-full text-left text-sm border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 border-b border-[#cdd8c3] bg-[#e7eddd] dark:border-[#3a5145] dark:bg-[#263a30]/95 backdrop-blur-sm">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((row, idx) =>
                        selectedKeys.includes(getKey(row, idx))
                      )
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}

              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 select-none text-xs uppercase tracking-wider',
                    col.sortable && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {rowActions && <th className="w-12 px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {selectable && (
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}
                  {activeColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-6 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    activeColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
                  }
                  className="p-8 text-center"
                >
                  <EmptyState
                    title={emptyTitle}
                    description={emptyMessage}
                    actionLabel={emptyAction?.label}
                    onAction={emptyAction?.onClick}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const key = getKey(row, idx)
                const isSelected = selectedKeys.includes(key)

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors duration-100',
                      // Zebra row styling
                      idx % 2 === 1
                        ? 'bg-[#f0f3e8] dark:bg-[#21332a]'
                        : 'bg-[#fbfbf4] dark:bg-[#1a2922]',
                      onRowClick && 'cursor-pointer hover:bg-[#e2ecdc] dark:hover:bg-[#2c4337]',
                      isSelected && '!bg-[#dce9d5] dark:!bg-[#315142]'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(key, e as any)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select row ${idx + 1}`}
                        />
                      </td>
                    )}

                    {activeColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-slate-700 dark:text-slate-300',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.accessor ? col.accessor(row) : row[col.key] ?? '—'}
                      </td>
                    ))}

                    {rowActions && (
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          }
                          items={rowActions(row)}
                        />
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {sortedData.length}
            </span>{' '}
            results
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
