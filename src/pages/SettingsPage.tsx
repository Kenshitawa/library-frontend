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
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          Library Settings
        </h2>
        <p className="text-xs text-slate-500">
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
                    Б°⌠ Profile settings updated successfully!
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(borrowerTypes || []).map((type) => (
                  <div key={type.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {type.name}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">
                        Rule: {type.return_rule.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div>Max items: <strong className="text-slate-800 dark:text-slate-200">{type.max_items}</strong></div>
                      <div>Loan days: <strong className="text-slate-800 dark:text-slate-200">{type.return_days}</strong></div>
                      <div>Max renewals: <strong className="text-slate-800 dark:text-slate-200">{type.max_renewals}</strong></div>
                      <div>Can reserve: <strong className="text-slate-800 dark:text-slate-200">{type.can_reserve ? 'Yes' : 'No'}</strong></div>
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

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(locations || []).map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{loc.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-danger"
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

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(subjects || []).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{sub.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-danger"
                      onClick={() => handleDeleteSubject(sub.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
        #^4ЦKh▒ИЛ╤╩╖q╚^v┬⌡щ\н┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиь⌡э°⌡щы\°ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиь⌡э°⌡щы\°ивVир[°ы\²	вO┌┬B┬\ы\°вэ⌡ы [N┬б┬⌡щн┬б┬Y┬щ [≥б┬≤[YN┬щ [≥б┬[XZ[┬щ [≥б┬⌡шN┬	шX°≤\ X[┴х	щXXз\┴б┬Xщ]≥N┬⌡шшX[┌┬⌡э°⌡щы\≈зY┬щ [≥х²[┬[YN┬щ [≥б┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVищ\ы\°вэ⌡ы [IвVит⌡щивK	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVищ\ы\°вэ⌡ы [IвVир[°ы\²	вO┌┬B┬]]э°н┬б┬⌡щн┬б┬Y┬щ [≥б┬≤[YN┬щ [≥б┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиь]]э°ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиь]]э°ивVир[°ы\²	вO┌┬B┬]\н┬б┬⌡щн┬б┬Y┬щ [≥б┬]N┬щ [≥б┬щX²]N┬щ [≥х²[┬\ь⌡▄L┬щ [≥х²[┬\ь⌡▄Lн┬щ [≥х²[┬X⌡\з\▌┬щ [≥х²[┬YX\▌┬²[X≥\┬²[┬Y][ш▌┬щ [≥х²[┬[≥щXYыN┬щ [≥б┬щX ≥XщзY┬щ [≥х²[┬э≤YWш]≥[┬щ [≥х²[┬\N┬	щ^⌡шзих	шX°≤\·Iх	э≥Y≥\≥[≤ыIб┬\ьэ \[ш▌┬щ [≥х²[┬шщ≥\≈щ\⌡┬щ [≥х²[┬Yэн┬щ [≥жвH²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]\ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]\ивVир[°ы\²	вO┌┬B┬]Wь]]э°н┬б┬⌡щн┬б┬]WзY┬щ [≥б┬]]э≈зY┬щ [≥б┬B┬[°ы\²┬]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]Wь]]э°ивVит⌡щивB┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]Wь]]э°ивVир[°ы\²	вO┌┬B┬шэY\н┬б┬⌡щн┬б┬Y┬щ [≥б┬]WзY┬щ [≥б┬≤\≤шыN┬щ [≥б┬ьь][ш≈зY┬щ [≥х²[┬ь[ш²[X≥\▌┬щ [≥х²[┬щ]\н┬	ь]≤Z[X⌡Iх	з\эщYY	х	э≥\ы\²≥Y	х	з[≈э⌡ьы\эз[≥их	шэщ	х	ы[XYыY	х	щз]≤]ш┴б┬шш≥][ш▌┬	ышшы	х	ы≤Z\┴х	эшэ┴х	ы[XYыY	б┬Xэ]Z\≥Yшш▌┬щ [≥х²[┬ XыN┬²[X≥\┬²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиьшэY\ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиьшэY\ивVир[°ы\²	вO┌┬B┬\эщY\н┬б┬⌡щн┬б┬Y┬щ [≥б┬шэWзY┬щ [≥б┬⌡э°⌡щы\≈зY┬щ [≥б┬\эщYYь]┬щ [≥б┬YWь]┬щ [≥б┬≥]\⌡≥Yь]┬щ [≥х²[┬≥[≥]ь[ьшщ[²┬²[X≥\┌┬шш≥][ш≈ь]з\эщYN┬	ышшы	х	ы≤Z\┴х	эшэ┴х	ы[XYыY	б┬шш≥][ш≈ь]э≥]\⌡▌┬	ышшы	х	ы≤Z\┴х	эшэ┴х	ы[XYыY	х²[┬\эщYYь·N┬щ [≥х²[┬≥]\⌡≥Yщн┬щ [≥х²[┬щ]\н┬	шэ[┴х	э≥]\⌡≥Y	х	шэщ	б┬≥]\⌡≈ш⌡щN┬щ [≥х²[┬≥]\⌡≈эщвщ\⌡┬щ [≥х²[┬щ≥\° YWэ≥X\шш▌┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиз\эщY\ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиз\эщY\ивVир[°ы\²	вO┌┬B┬≥\ы\²≤][ш°н┬б┬⌡щн┬б┬Y┬щ [≥б┬]WзY┬щ [≥б┬⌡э°⌡щы\≈зY┬щ [≥б┬XыYь]┬щ [≥б┬щ]\н┬	щьZ][≥их	э≥XYIх	ы²[ [Y	х	ьь[≤ы[Y	х	ы^\≥Y	б┬≥XYWьшэWзY┬щ [≥х²[┬Xзщ\ыXY[≥N┬щ [≥х²[┬]Y]YWээз][ш▌┬²[X≥\┬²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ≥\ы\²≤][ш°ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ≥\ы\²≤][ш°ивVир[°ы\²	вO┌┬B┬з\≥ы\н┬б┬⌡щн┬б┬Y┬щ [≥б┬⌡э°⌡щы\≈зY┬щ [≥б┬\эщYWзY┬щ [≥х²[┬\N┬	шэщ	х	ы[XYыY	х	шщ≥\≥YIх	шX[²X[	б┬[[щ[²┬²[X≥\┌┬ZYь[[щ[²┬²[X≥\┌┬щ]\н┬	шэ[┴х	э\²X[	х	эZY	х	щьZ]≥Y	б┬≥X\шш▌┬щ [≥х²[┬ьZ]≥Yь·N┬щ [≥х²[┬ьZ]≥Wэ≥X\шш▌┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬[]Yь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиьз\≥ы\ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиьз\≥ы\ивVир[°ы\²	вO┌┬B┬^[Y[²н┬б┬⌡щн┬б┬Y┬щ [≥б┬з\≥ыWзY┬щ [≥б┬⌡э°⌡щы\≈зY┬щ [≥б┬[[щ[²┬²[X≥\┌┬≥XыZ]≥Yь·N┬щ [≥х²[┬≥XыZ]≥Yь]┬щ [≥б┬≥XыZ\ш⌡н┬щ [≥х²[┬≥XыZ\щ\⌡┬щ [≥х²[┬⌡щ\н┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ^[Y[²ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ^[Y[²ивVир[°ы\²	вO┌┬B┬⌡щY Xь][ш°н┬б┬⌡щн┬б┬Y┬щ [≥б┬⌡э°⌡щы\≈зY┬щ [≥х²[┬\N┬щ [≥б┬з[⌡≥[┬щ [≥б┬≥Xз\Y[²┬щ [≥х²[┬щX ≥Xщ┬щ [≥х²[┬⌡ыN┬щ [≥х²[┬ы[²ь]┬щ [≥х²[┬щ]\н┬	э[≥[≥их	эы[²	х	ы≤Z[Y	х	ш⌡щэы[²	б┬\°⌡э▌┬щ [≥х²[┬≥XYь]┬щ [≥х²[┬≥\э²зY┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬\]Yь]┬щ [≥б┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиш⌡щY Xь][ш°ивVит⌡щивK	зY	х	ьэ≥X]Yь]	х	щ\]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиш⌡щY Xь][ш°ивVир[°ы\²	вO┌┬B┬[²≥[²э·Wэ≥\э²н┬б┬⌡щн┬б┬Y┬щ [≥б┬ы[≥\≤]Yь]┬щ [≥б┬⌡щвьшщ[²┬²[X≥\┌┬ш≤\зщ┬°шш┌┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиз[²≥[²э·Wэ≥\э²ивVит⌡щивK	зY	х	ыы[≥\≤]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиз[²≥[²э·Wэ≥\э²ивVир[°ы\²	вO┌┬B┬ь[[≥\≈ы≥YYн┬б┬⌡щн┬б┬Y┬щ [≥б┬\ы\≈зY┬щ [≥б┬зы[≈з\з┬щ [≥б┬э≥X]Yь]┬щ [≥б┬≥]⌡зыYь]┬щ [≥х²[┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиьь[[≥\≈ы≥YYивVит⌡щивK	зY	х	ьэ≥X]Yь]	о┌┬\]N┬\²X[]X≤\ыVиэX⌡XивVиуX⌡\ивVиьь[[≥\≈ы≥YYивVир[°ы\²	вO┌┬B┬]Y]шын┬б┬⌡щн┬б┬Y┬щ [≥б┬\ы\≈зY┬щ [≥х²[┬Xщ[ш▌┬щ [≥б┬[²]N┬щ [≥б┬[²]WзY┬щ [≥х²[┬≥Y⌡э≥N┬°шш┬²[┬Y²\▌┬°шш┬²[┬\ьY▌┬щ [≥х²[┬э≥X]Yь]┬щ [≥б┬B┬[°ы\²┬шZ]]X≤\ыVиэX⌡XивVиуX⌡\ивVиь]Y]шыивVит⌡щивK	зY	х	ьэ≥X]Yь]	о┌┬\]N┬≥]≥\┌┬B┬B┬ Y]эн┬≥Xшэ≥щ [≥к≥]≥\▐┌┬²[≤щ[ш°н┬б┬ы]щ\ы\≈э⌡шN┬б┬\≥эн┬≥Xшэ≥щ [≥к≥]≥\▐┌┬≥]\⌡°н┬щ [≥б┬B┬ы]ь⌡э°⌡щы\≈шэ[≈з\эщY\н┬б┬\≥эн┬хь⌡э°⌡щы\≈зY┬щ [≥хB┬≥]\⌡°н┬²[X≥\┌┬B┬ы]ь⌡э°⌡щы\≈шщ]щ[≥[≥вьз\≥ы\н┬б┬\≥эн┬хь⌡э°⌡щы\≈зY┬щ [≥хB┬≥]\⌡°н┬²[X≥\┌┬B┬зXзвз\эщYWь⌡ьзэн┬б┬\≥эн┬хьшэWзY┬щ [≥нхь⌡э°⌡щы\≈зY┬щ [≥хB┬≥]\⌡°н┬х⌡ьзыY┬⌡шшX[▌х≥X\шш▌┬щ [≥хVвB┬B┬X\ вш⌡щY Xь][ш≈э≥XY┬б┬\≥эн┬хш⌡щY Xь][ш≈зY┬щ [≥хB┬≥]\⌡°н┬[≥Y [≥Y┬B┬B┬[²[\н┬≥Xшэ≥щ [≥к≥]≥\▐┌┬B÷B┌▀кхшш²≥[ Y[≤ыH⌡щх\\б≥^э²\HX°≤\·T⌡ы [HH]X≤\ыVиэX⌡XивVиуX⌡\ивVишX°≤\·Wэ⌡ы [IвVит⌡щивB≥^э²\HщX ≥XщH]X≤\ыVиэX⌡XивVиуX⌡\ивVиэщX ≥XщивVит⌡щивB≥^э²\Hьь][ш┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVишьь][ш°ивVит⌡щивB≥^э²\H⌡э°⌡щы\∙\HH]X≤\ыVиэX⌡XивVиуX⌡\ивVиь⌡э°⌡щы\≈щ\\ивVит⌡щивB≥^э²\Hш\эхH]X≤\ыVиэX⌡XивVиуX⌡\ивVиьш\эы\ивVит⌡щивB≥^э²\H⌡э°⌡щы\┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVиь⌡э°⌡щы\°ивVит⌡щивB≥^э²\H\ы\■⌡ы [HH]X≤\ыVиэX⌡XивVиуX⌡\ивVищ\ы\°вэ⌡ы [IвVит⌡щивB≥^э²\H]]э┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVиь]]э°ивVит⌡щивB≥^э²\H]HH]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]\ивVит⌡щивB≥^э²\H]P]]э┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVищ]Wь]]э°ивVит⌡щивB≥^э²\HшэHH]X≤\ыVиэX⌡XивVиуX⌡\ивVиьшэY\ивVит⌡щивB≥^э²\H\эщYHH]X≤\ыVиэX⌡XивVиуX⌡\ивVиз\эщY\ивVит⌡щивB≥^э²\H≥\ы\²≤][ш┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ≥\ы\²≤][ш°ивVит⌡щивB≥^э²\Hз\≥ыHH]X≤\ыVиэX⌡XивVиуX⌡\ивVиьз\≥ы\ивVит⌡щивB≥^э²\H^[Y[²H]X≤\ыVиэX⌡XивVиуX⌡\ивVиэ^[Y[²ивVит⌡щивB≥^э²\H⌡щY Xь][ш┬H]X≤\ыVиэX⌡XивVиуX⌡\ивVиш⌡щY Xь][ш°ивVит⌡щивB≥^э²\Hь[[≥\▒≥YYH]X≤\ыVиэX⌡XивVиуX⌡\ивVиьь[[≥\≈ы≥YYивVит⌡щивB≥^э²\H]Y]ыхH]X≤\ыVиэX⌡XивVиуX⌡\ивVиь]Y]шыивVит⌡щивB