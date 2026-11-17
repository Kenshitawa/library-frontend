import React, { useEffect, useState } from 'react'
import {
  Settings,
  Building,
  Users,
  MapPin,
  BookMarked,
  GraduationCap,
  DollarSign,
  Plus,
  Trash2,
  Check,
  Save,
  BellRing,
  CalendarClock,
  Download,
  Monitor,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { useTheme } from '@/hooks/useTheme'
import { useBorrowerTypes, useClasses } from '@/hooks/useBorrowers'
import { useSubjects, useLocations } from '@/hooks/useTitles'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { enableNotificationSound } from '@/lib/notificationSound'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { profile, updateProfile, isUpdating } = useLibraryProfile()
  const { themePreference, setSystemTheme } = useTheme()
  const { data: borrowerTypes } = useBorrowerTypes()
  const { data: classes } = useClasses()
  const { data: subjects } = useSubjects()
  const { data: locations } = useLocations()

  const [tab, setTab] = useState('profile')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(
    () => localStorage.getItem('library-notification-sound') === 'on'
  )

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    address: profile?.address || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    timezone: profile?.timezone || 'Africa/Nairobi',
    currency: profile?.currency || 'KES',
    damage_window_days: profile?.damage_window_days || 7,
    lost_threshold_weeks: profile?.lost_threshold_weeks || 4,
  })

  useEffect(() => {
    if (!profile) return
    setProfileForm({
      name: profile.name || '',
      address: profile.address || '',
      email: profile.email || '',
      phone: profile.phone || '',
      timezone: profile.timezone || 'Africa/Nairobi',
      currency: profile.currency || 'KES',
      damage_window_days: profile.damage_window_days || 7,
      lost_threshold_weeks: profile.lost_threshold_weeks || 4,
    })
  }, [profile])

  // New subject/location/class state
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newClassGrade, setNewClassGrade] = useState('')

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile(profileForm)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err: any) {
      toast.error(err?.message || 'Could not save library profile.')
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    try {
      const { error } = await supabase.from('subjects').insert({ name: newSubjectName.trim() } as any)
      if (error) throw new Error(error.message)
      setNewSubjectName('')
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add subject.')
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm('Delete this subject?')) {
      try {
        const { error } = await (supabase as any).from('subjects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw new Error(error.message)
        queryClient.invalidateQueries({ queryKey: ['subjects'] })
        toast.success('Subject removed.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not remove subject.')
      }
    }
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocationName.trim()) return
    try {
      const { error } = await (supabase as any).from('locations').insert({ name: newLocationName.trim() })
      if (error) throw new Error(error.message)
      setNewLocationName('')
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add location.')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Delete this location?')) {
      try {
        const { error } = await (supabase as any).from('locations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw new Error(error.message)
        queryClient.invalidateQueries({ queryKey: ['locations'] })
        toast.success('Location removed.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not remove location.')
      }
    }
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return
    const { error } = await (supabase as any).from('classes').insert({
      name: newClassName.trim(),
      grade_level: newClassGrade.trim() || null,
      year: new Date().getFullYear(),
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setNewClassName('')
    setNewClassGrade('')
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    toast.success('Class added.')
  }

  const handleDeleteClass = async (id: string) => {
    if (window.confirm('Delete this class?')) {
      try {
        const { error } = await (supabase as any).from('classes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw new Error(error.message)
        queryClient.invalidateQueries({ queryKey: ['classes'] })
        toast.success('Class removed.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not remove class.')
      }
    }
  }

  const handleNotificationSoundChange = async (enabled: boolean) => {
    if (!enabled) {
      localStorage.setItem('library-notification-sound', 'off')
      setNotificationSoundEnabled(false)
      return
    }

    try {
      await enableNotificationSound()
      localStorage.setItem('library-notification-sound', 'on')
      setNotificationSoundEnabled(true)
      toast.success('Notification sound enabled.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable notification sound.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading sm:text-2xl">
          Library Settings
        </h2>
        <p className="text-xs text-faint">
          Configure school identity, issue policies, locations, subjects, and fee rules
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto max-w-full">
          <TabsTrigger value="profile">School Profile</TabsTrigger>
          <TabsTrigger value="borrower_types">Borrower Policies</TabsTrigger>
          <TabsTrigger value="locations">Locations & Shelves</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes & Streams</TabsTrigger>
          <TabsTrigger value="charges">Charge & Fee Rules</TabsTrigger>
          <TabsTrigger value="automation">Notifications & Reports</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>School & Library Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-2xl">
                {saveSuccess && (
                  <div className="rounded-md bg-success-50 p-3 text-xs text-success-700 font-medium">
                    ✓ Profile settings updated successfully!
                  </div>
                )}

                <Input
                  label="Library / School Name"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g. Greenwood High School Library"
                />

                <Input
                  label="Address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Official Email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />

                  <Input
                    label="Phone Number"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />

                  <Input
                    label="System Timezone"
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                  />

                  <Input
                    label="Currency Code"
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={isUpdating} leftIcon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Borrower Policies */}
        <TabsContent value="borrower_types">
          <Card>
            <CardHeader>
              <CardTitle>Borrower Types & Lending Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-line">
                {(borrowerTypes || []).map((type) => (
                  <div key={type.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-heading">
                        {type.name}
                      </span>
                      <span className="text-xs text-muted capitalize">
                        Rule: {type.return_rule.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted">
                      <div>Max items: <strong className="text-body">{type.max_items}</strong></div>
                      <div>Loan days: <strong className="text-body">{type.return_days}</strong></div>
                      <div>Max renewals: <strong className="text-body">{type.max_renewals}</strong></div>
                      <div>Can reserve: <strong className="text-body">{type.can_reserve ? 'Yes' : 'No'}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Locations */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Locations & Shelves</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddLocation} className="flex gap-2 max-w-md">
                <Input
                  placeholder="New location / shelf name..."
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
                <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Add
                </Button>
              </form>

              <div className="divide-y divide-line">
                {(locations || []).map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-body">{loc.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted hover:text-danger"
                      onClick={() => handleDeleteLocation(loc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Subjects */}
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Catalog Subjects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddSubject} className="flex gap-2 max-w-md">
                <Input
                  placeholder="New subject name..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
                <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Add
                </Button>
              </form>

              <div className="divide-y divide-line">
                {(subjects || []).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-body">{sub.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted hover:text-danger"
                      onClick={() => handleDeleteSubject(sub.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Classes */}
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>Classes & Year Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddClass} className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl">
                <Input
                  placeholder="Class name (e.g. Grade 9 Blue)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <Input
                  placeholder="Grade level (e.g. Grade 9)"
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(e.target.value)}
                />
                <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Add Class
                </Button>
              </form>

              <div className="divide-y divide-line">
                {(classes || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-heading">{c.name}</span>
                      {c.grade_level && (
                        <span className="text-muted ml-2">({c.grade_level})</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted hover:text-danger"
                      onClick={() => handleDeleteClass(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Charge Rules */}
        <TabsContent value="charges">
          <Card>
            <CardHeader>
              <CardTitle>Charge & Replacement Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl text-xs">
              <div className="space-y-3">
                <Input
                  label="Damage Reporting Window (Days)"
                  type="number"
                  value={profileForm.damage_window_days}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, damage_window_days: Number(e.target.value) })
                  }
                  description="Damage reported within this many days of issue is exempt from return penalty charges."
                />

                <Input
                  label="Lost Book Threshold (Weeks Overdue)"
                  type="number"
                  value={profileForm.lost_threshold_weeks}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lost_threshold_weeks: Number(e.target.value) })
                  }
                  description="Books overdue past this threshold can be converted to Lost status with a replacement charge."
                />

                <div className="pt-2">
                  <Button
                    variant="primary"
                    loading={isUpdating}
                    onClick={handleProfileSubmit}
                  >
                    Save Charge Rules
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted">
                  {themePreference === 'system'
                    ? 'The library follows your device’s light or dark setting.'
                    : `The library is using ${themePreference} mode.`}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void setSystemTheme()}
                  disabled={themePreference === 'system'}
                >
                  Use device appearance
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  <CardTitle>Notification sound</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={notificationSoundEnabled}
                    onChange={(event) => void handleNotificationSoundChange(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-heading">
                      Play a short tone for new notifications
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      This preference is saved on this browser. Enable it on each librarian workstation that should play a tone.
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-caution" />
                  <CardTitle>Scheduled library notices</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg bg-caution/10 p-3">
                  <p className="font-semibold text-heading">Inventory snapshot every 30 days</p>
                  <p className="mt-1 text-xs text-muted">
                    A complete, saved copy-by-copy snapshot is created automatically and appears in Notifications.
                  </p>
                </div>
                <div className="rounded-lg bg-negative/10 p-3">
                  <p className="font-semibold text-heading">Uncollected reservations after 3 days</p>
                  <p className="mt-1 text-xs text-muted">
                    The reservation expires and a printable warning letter is added to Notifications.
                  </p>
                </div>
                <Link to="/reports?report=inventory">
                  <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
                    Open inventory report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
