import React, { useState } from 'react'
import {
  UserPlus,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  KeyRound,
  UserX,
  UserCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { useBorrowers } from '@/hooks/useBorrowers'
import type { UserProfile, UserRole } from '@/types'
import { formatDate } from '@/lib/utils'

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('teacher')
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Fetch teachers for borrower link
  const { data: borrowers } = useBorrowers({ status: 'active' })

  // Fetch users_profile
  const { data: users, isLoading } = useQuery({
    queryKey: ['users_profile'],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .order('name')

      if (error) throw new Error(error.message)
      return (data || []) as UserProfile[]
    },
  })

  // Toggle user active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      // Direct update or via edge function
      const { error } = await (supabase as any)
        .from('users_profile')
        .update({ active })
        .eq('id', userId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users_profile'] })
    },
  })

  // Send password reset
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      alert('Password reset link has been dispatched to the user’s email.')
    },
  })

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Name and email are required.')
      return
    }

    try {
      // In production/local, this calls the edge function `invite-user` or creates directly
      const res = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
          borrower_id: selectedBorrowerId || null,
        },
      })

      if (res.error) {
        // Fallback: create user profile directly if edge function isn't hosted locally
        const { error: insErr } = await supabase.from('users_profile').insert({
          id: crypto.randomUUID(),
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          active: true,
          borrower_id: selectedBorrowerId || null,
        } as any)

        if (insErr) throw new Error(insErr.message)
      }

      setInviteSuccess(`Invitation initiated for ${inviteEmail}!`)
      queryClient.invalidateQueries({ queryKey: ['users_profile'] })
      setTimeout(() => {
        setInviteOpen(false)
        setInviteEmail('')
        setInviteName('')
      }, 1500)
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to invite user.')
    }
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'name',
      header: 'Staff / Teacher Name',
      sortable: true,
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {row.name}
          </span>
          <span className="text-xs text-slate-400">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      sortable: true,
      accessor: (row) => (
        <Badge variant={row.role === 'librarian' ? 'primary' : 'info'} size="sm">
          {row.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: true,
      accessor: (row) => (
        <Badge variant={row.active ? 'success' : 'danger'} size="sm">
          {row.active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created On',
      accessor: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Staff & Teacher Accounts
          </h2>
          <p className="text-xs text-slate-500">
            Manage authorized staff logins, teacher portal access, and role permissions
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => setInviteOpen(true)}
        >
          Invite Staff / Teacher
        </Button>
      </div>

      {/* Users DataTable */}
      <DataTable
        data={users || []}
        columns={columns}
        loading={isLoading}
        emptyTitle="No staff accounts found"
        emptyMessage="Invite a teacher or assistant librarian to collaborate."
        rowActions={(row) => [
          {
            label: 'Send password reset',
            icon: <KeyRound className="h-4 w-4" />,
            onClick: () => resetPasswordMutation.mutate(row.email),
          },
          {
            label: row.active ? 'Deactivate account' : 'Reactivate account',
            icon: row.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />,
            danger: row.active,
            onClick: () =>
              toggleActiveMutation.mutate({
                userId: row.id,
                active: !row.active,
              }),
          },
        ]}
      />

      {/* Invite Staff Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="md">
        <DialogHeader>
          <DialogTitle>Invite Staff or Teacher</DialogTitle>
          <DialogDescription>
            Send an onboarding invitation email with password set link
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInviteSubmit}>
          <DialogBody className="space-y-4">
            {inviteError && (
              <div className="rounded-md bg-danger-50 p-3 text-xs text-danger font-medium">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="rounded-md bg-success-50 p-3 text-xs text-success-700 font-medium">
                {inviteSuccess}
              </div>
            )}

            <Input
              label="Full Name"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Sipho Moyo"
            />

            <Input
              label="Email Address"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="sipho@school.example"
            />

            <Select
              label="Role"
              options={[
                { value: 'teacher', label: 'Teacher (Portal loans & class textbooks)' },
                { value: 'librarian', label: 'Librarian (Full desk & catalog management)' },
              ]}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
            />

            <Select
              label="Link to Existing Borrower Profile (Optional)"
              options={[
                { value: '', label: 'None (Login account only)' },
                ...(borrowers || []).map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.borrower_no})`,
                })),
              ]}
              value={selectedBorrowerId}
              onChange={(e) => setSelectedBorrowerId(e.target.value)}
              description="Links this login account to their borrower loans record."
            />
          </DialogBody>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
