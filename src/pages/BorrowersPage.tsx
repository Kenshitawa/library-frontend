import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  Eye,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  useBorrowers,
  useBorrowerTypes,
  useClasses,
  useCreateBorrower,
  useUpdateBorrower,
  type BorrowerFilters,
} from '@/hooks/useBorrowers'
import type { Borrower } from '@/types'

export const BorrowersPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'all' | 'learners' | 'teachers'>('all')
  const [filters, setFilters] = useState<BorrowerFilters>({
    search: '',
    status: 'all',
  })
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: borrowers, isLoading } = useBorrowers(filters)
  const { data: borrowerTypes } = useBorrowerTypes()
  const { data: classes } = useClasses()
  const createBorrower = useCreateBorrower()
  const updateBorrower = useUpdateBorrower()

  // New borrower form state
  const [newBorrower, setNewBorrower] = useState({
    name: '',
    borrower_no: '',
    borrower_type_id: '',
    class_id: '',
    date_of_birth: '',
    phone: '',
    email: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    department: '',
    notes: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const selectedBorrowerType = (borrowerTypes || []).find(
    (type) => type.id === newBorrower.borrower_type_id
  )
  const isLearner = selectedBorrowerType?.name.toLowerCase().includes('learner') ?? false

  const openAddDialog = () => {
    const defaultLearnerType = (borrowerTypes || []).find((type) =>
      type.name.toLowerCase().includes('learner')
    )
    setNewBorrower((current) => ({
      ...current,
      borrower_type_id: current.borrower_type_id || defaultLearnerType?.id || '',
    }))
    setFormError(null)
    setAddDialogOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('new') !== '1' || !borrowerTypes) return

    const defaultLearnerType = borrowerTypes.find((type) =>
      type.name.toLowerCase().includes('learner')
    )
    setNewBorrower((current) => ({
      ...current,
      borrower_type_id: current.borrower_type_id || defaultLearnerType?.id || '',
    }))
    setFormError(null)
    setAddDialogOpen(true)

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('new')
    setSearchParams(nextSearchParams, { replace: true })
  }, [borrowerTypes, searchParams, setSearchParams])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newBorrower.name.trim() || !newBorrower.borrower_no.trim() || !newBorrower.borrower_type_id) {
      setFormError('Name, learner/staff number, and borrower type are required.')
      return
    }

    if (isLearner && !newBorrower.class_id) {
      setFormError('Choose a class for this learner.')
      return
    }

    try {
      const created = await createBorrower.mutateAsync({
        name: newBorrower.name.trim(),
        borrower_no: newBorrower.borrower_no.trim(),
        borrower_type_id: newBorrower.borrower_type_id || undefined,
        class_id: newBorrower.class_id || undefined,
        date_of_birth: newBorrower.date_of_birth || null,
        phone: newBorrower.phone.trim() || null,
        email: newBorrower.email.trim() || null,
        guardian_name: newBorrower.guardian_name.trim() || null,
        guardian_phone: newBorrower.guardian_phone.trim() || null,
        guardian_email: newBorrower.guardian_email.trim() || null,
        department: newBorrower.department.trim() || null,
        notes: newBorrower.notes.trim() || null,
        status: 'active',
        joined_on: new Date().toISOString().split('T')[0],
      })

      setAddDialogOpen(false)
      navigate(`/borrowers/${created.id}`)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create borrower.')
    }
  }

  // Filter based on tab
  const displayedBorrowers = (borrowers || []).filter((b) => {
    if (tab === 'learners') {
      return b.borrower_type?.name?.toLowerCase().includes('learner') ?? true
    }
    if (tab === 'teachers') {
      return b.borrower_type?.name?.toLowerCase().includes('teacher') ?? false
    }
    return true
  })

  const columns: Column<Borrower>[] = [
    {
      key: 'borrower_no',
      header: 'ID / Admission #',
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
          {row.borrower_no}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Full Name',
      sortable: true,
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
            {row.name}
          </span>
          {row.email && <span className="text-xs text-slate-400">{row.email}</span>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (row) => {
        const isTeacher = row.borrower_type?.name?.toLowerCase().includes('teacher')
        return (
          <Badge variant={isTeacher ? 'info' : 'success'} size="sm">
            {row.borrower_type?.name || 'Learner'}
          </Badge>
        )
      },
    },
    {
      key: 'class',
      header: 'Class / Dept',
      accessor: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.class?.name || row.department || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'} size="sm">
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Borrowers Directory
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage learners and teaching staff eligible to borrow books
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openAddDialog}
        >
          Add Learner or Teacher
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(val: any) => setTab(val)}>
        <TabsList>
          <TabsTrigger value="all">All Borrowers</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-card border border-slate-200 dark:border-slate-800 shadow-sm">
        <Input
          placeholder="Search by name, ID number, email..."
          leftAddon={<Search className="h-4 w-4" />}
          value={filters.search || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />

        <Select
          options={[
            { value: 'all', label: 'All Classes' },
            ...(classes || []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={filters.classId || 'all'}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              classId: e.target.value === 'all' ? undefined : e.target.value,
            }))
          }
        />

        <Select
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' },
          ]}
          value={filters.status || 'all'}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: e.target.value as any,
            }))
          }
        />
      </div>

      {/* Borrowers DataTable */}
      <DataTable
        data={displayedBorrowers}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => navigate(`/borrowers/${row.id}`)}
        emptyTitle="No borrowers found"
        emptyMessage="Try adjusting your search criteria or register a new borrower."
        emptyAction={{
          label: 'Add Learner or Teacher',
          onClick: openAddDialog,
        }}
        rowActions={(row) => [
          {
            label: 'View borrower file',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => navigate(`/borrowers/${row.id}`),
          },
        ]}
      />

      {/* Add Borrower Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogHeader>
          <DialogTitle>Register New Borrower</DialogTitle>
          <DialogDescription>
            Save a learner or teacher profile for issuing and returning books.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateSubmit}>
          <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {formError && (
              <div className="rounded-md bg-danger-50 p-3 text-xs text-danger font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                value={newBorrower.name}
                onChange={(e) => setNewBorrower({ ...newBorrower, name: e.target.value })}
                placeholder="e.g. Sindi Ndlovu"
              />

              <Input
                label="Admission # / Staff ID"
                required
                value={newBorrower.borrower_no}
                onChange={(e) => setNewBorrower({ ...newBorrower, borrower_no: e.target.value })}
                placeholder="e.g. ADM-2024-001"
              />

              <Select
                label="Borrower Type"
                required
                options={[
                  { value: '', label: 'Select Type...' },
                  ...(borrowerTypes || []).map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={newBorrower.borrower_type_id}
                onChange={(e) =>
                  setNewBorrower((current) => ({
                    ...current,
                    borrower_type_id: e.target.value,
                    class_id: '',
                  }))
                }
              />

              {isLearner && (
                <>
                  <Select
                    label="Class"
                    required
                    options={[
                      { value: '', label: 'Select class...' },
                      ...(classes || []).map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={newBorrower.class_id}
                    onChange={(e) => setNewBorrower({ ...newBorrower, class_id: e.target.value })}
                  />
                  <Input
                    label="Date of birth (optional)"
                    type="date"
                    value={newBorrower.date_of_birth}
                    onChange={(e) => setNewBorrower({ ...newBorrower, date_of_birth: e.target.value })}
                  />
                </>
              )}

              <Input
                label="Phone number"
                value={newBorrower.phone}
                onChange={(e) => setNewBorrower({ ...newBorrower, phone: e.target.value })}
                placeholder="+27..."
              />

              <Input
                label="Email"
                type="email"
                value={newBorrower.email}
                onChange={(e) => setNewBorrower({ ...newBorrower, email: e.target.value })}
                placeholder="sindi@school.example"
              />

              {isLearner && (
                <>
                  <Input
                    label="Parent / guardian name"
                    value={newBorrower.guardian_name}
                    onChange={(e) => setNewBorrower({ ...newBorrower, guardian_name: e.target.value })}
                    placeholder="Parent or guardian"
                  />
                  <Input
                    label="Parent / guardian phone"
                    type="tel"
                    value={newBorrower.guardian_phone}
                    onChange={(e) => setNewBorrower({ ...newBorrower, guardian_phone: e.target.value })}
                    placeholder="+27..."
                  />
                  <Input
                    label="Parent / guardian email"
                    type="email"
                    value={newBorrower.guardian_email}
                    onChange={(e) => setNewBorrower({ ...newBorrower, guardian_email: e.target.value })}
                    placeholder="parent@example.com"
                  />
                </>
              )}

              {!isLearner && selectedBorrowerType && (
                <Input
                  label="Department"
                  value={newBorrower.department}
                  onChange={(e) => setNewBorrower({ ...newBorrower, department: e.target.value })}
                  placeholder="e.g. Mathematics"
                />
              )}
            </div>
            <Input
              label="Notes (optional)"
              value={newBorrower.notes}
              onChange={(e) => setNewBorrower({ ...newBorrower, notes: e.target.value })}
              placeholder="Additional information for library staff"
            />
          </DialogBody>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createBorrower.isPending}
            >
              Save Borrower
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}

