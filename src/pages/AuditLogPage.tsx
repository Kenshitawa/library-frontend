import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useAuditLog, type AuditLogFilters } from '@/hooks/useAuditLog'
import type { AuditLog } from '@/types'
import { formatDateTime } from '@/lib/utils'

export const AuditLogPage: React.FC = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const { data: logs, isLoading } = useAuditLog(filters)

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      accessor: (row) => (
        <span className="text-xs text-faint font-mono">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Staff User',
      accessor: (row: any) => (
        <span className="text-xs font-medium text-heading">
          {row.user?.name || row.user_id || 'System'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      accessor: (row) => {
        const action = row.action.toUpperCase()
        const variantMap: Record<string, 'primary' | 'success' | 'danger' | 'warning' | 'info'> = {
          INSERT: 'success',
          UPDATE: 'info',
          DELETE: 'danger',
          ISSUE: 'primary',
          RETURN: 'success',
        }
        return (
          <Badge variant={variantMap[action] || 'gray'} size="sm">
            {action}
          </Badge>
        )
      },
    },
    {
      key: 'entity',
      header: 'Entity / Table',
      accessor: (row) => (
        <span className="text-xs font-mono font-medium text-body">
          {row.entity}
        </span>
      ),
    },
    {
      key: 'entity_id',
      header: 'Record ID',
      accessor: (row) => (
        <span className="text-xs font-mono text-muted truncate max-w-[120px] block">
          {row.entity_id}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Changes',
      align: 'right',
      accessor: (row) => (
        <button
          type="button"
          onClick={() => toggleExpand(row.id)}
          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          {expandedRowId === row.id ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Hide diff
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5" /> View diff
            </>
          )}
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-heading sm:text-2xl">
          System Audit Log
        </h2>
        <p className="text-xs text-faint">
          Immutable audit record of all create, update, delete, issue, and return transactions (FR-61, FR-62)
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-panel p-4 rounded-2xl border border-line shadow-sm">
        <Select
          options={[
            { value: '', label: 'All Actions' },
            { value: 'INSERT', label: 'INSERT' },
            { value: 'UPDATE', label: 'UPDATE' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
          value={filters.action || ''}
          onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
        />

        <Select
          options={[
            { value: '', label: 'All Entities' },
            { value: 'issues', label: 'issues' },
            { value: 'copies', label: 'copies' },
            { value: 'titles', label: 'titles' },
            { value: 'borrowers', label: 'borrowers' },
            { value: 'charges', label: 'charges' },
            { value: 'users_profile', label: 'users_profile' },
          ]}
          value={filters.entity || ''}
          onChange={(e) => setFilters({ ...filters, entity: e.target.value || undefined })}
        />

        <Input
          placeholder="Filter by User ID / Staff..."
          value={filters.userId || ''}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
        />
      </div>

      {/* DataTable */}
      <DataTable
        data={logs || []}
        columns={columns}
        loading={isLoading}
        emptyTitle="No audit records found"
        emptyMessage="Audit records will be recorded automatically as transactions occur."
      />

      {/* Expanded Diff Preview Modal / Drawer */}
      {expandedRowId && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Before / After JSON State</CardTitle>
            <button
              onClick={() => setExpandedRowId(null)}
              className="text-xs text-muted hover:text-faint"
            >
              Close
            </button>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const active = logs?.find((l) => l.id === expandedRowId)
              if (!active) return null
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <span className="font-bold text-muted block mb-1">Before:</span>
                    <pre className="p-3 bg-surface-2 rounded-md overflow-x-auto max-h-48 text-[11px]">
                      {active.before ? JSON.stringify(active.before, null, 2) : 'null (Created)'}
                    </pre>
                  </div>
                  <div>
                    <span className="font-bold text-muted block mb-1">After:</span>
                    <pre className="p-3 bg-surface-2 rounded-md overflow-x-auto max-h-48 text-[11px]">
                      {active.after ? JSON.stringify(active.after, null, 2) : 'null (Deleted)'}
                    </pre>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
