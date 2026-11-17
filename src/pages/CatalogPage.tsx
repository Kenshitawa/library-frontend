import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  BookOpen,
  BookMarked,
  Layers,
  ArrowUpRight,
  Eye,
  Library,
  Sparkles,
  X,
} from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Combobox } from '@/components/ui/Combobox'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  useTitles,
  useSubjects,
  useCreateSubject,
  useLocations,
  useCreateTitle,
  useAddCopy,
  type TitleFilters,
} from '@/hooks/useTitles'
import type { Title, BookType } from '@/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const createInitialTitle = () => ({
  title: '',
  subtitle: '',
  author: '',
  isbn10: '',
  isbn13: '',
  publisher: '',
  year: new Date().getFullYear(),
  edition: '1st',
  language: 'English',
  subject_id: '',
  grade_level: '',
  type: 'textbook' as BookType,
  description: '',
})

type CatalogSuggestions = {
  subject: string | null
  grade_level: string | null
  type: BookType | null
}

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<TitleFilters>({
    search: '',
    bookType: 'all',
    availability: 'all',
  })
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: titles, isLoading } = useTitles(filters)
  const { data: subjects } = useSubjects()
  const { data: locations } = useLocations()
  const createTitle = useCreateTitle()
  const addCopy = useAddCopy()
  const createSubject = useCreateSubject()

  /** Quick-add from either subject combobox: creates (or reuses) and returns the id. */
  const handleQuickAddSubject = async (name: string) => {
    const subject = await createSubject.mutateAsync(name)
    toast.success(`Subject “${subject.name}” is ready to use.`)
    return subject.id
  }

  const [newTitle, setNewTitle] = useState(createInitialTitle)
  const [firstCopyBarcode, setFirstCopyBarcode] = useState('')
  const [firstCopyLocation, setFirstCopyLocation] = useState('')
  const [createdTitleId, setCreatedTitleId] = useState<string | null>(null)
  const [typeManuallySelected, setTypeManuallySelected] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleOpenAddDialog = () => {
    setNewTitle(createInitialTitle())
    setFirstCopyBarcode('')
    setFirstCopyLocation('')
    setCreatedTitleId(null)
    setTypeManuallySelected(false)
    setAiMessage(null)
    setFormError(null)
    setAddDialogOpen(true)
  }

  const handleAiSuggest = async () => {
    if (!newTitle.title.trim()) {
      setFormError('Enter a title before asking AI for catalog suggestions.')
      return
    }

    setFormError(null)
    setAiMessage(null)
    setIsSuggesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('catalog-assist', {
        body: {
          title: newTitle.title.trim(),
          author: newTitle.author.trim(),
          subjects: (subjects || []).map((subject) => subject.name),
        },
      })

      if (error) {
        if (error.context instanceof Response) {
          const errorBody = await error.context.json().catch(() => null)
          if (typeof errorBody?.error === 'string') {
            throw new Error(errorBody.error)
          }
        }
        throw new Error(error.message)
      }
      if (!data || typeof data !== 'object') {
        throw new Error('The AI catalog service returned no suggestions.')
      }

      const suggestions = data as CatalogSuggestions
      const suggestedSubject = typeof suggestions.subject === 'string'
        ? subjects?.find((subject) => subject.name.toLowerCase() === suggestions.subject?.toLowerCase())
        : undefined
      const validTypes: BookType[] = ['textbook', 'library', 'reference']
      const suggestedType = validTypes.includes(suggestions.type as BookType)
        ? suggestions.type as BookType
        : null
      const suggestedGrade = typeof suggestions.grade_level === 'string'
        ? suggestions.grade_level.trim()
        : ''

      if (!suggestedSubject && !suggestedType && !suggestedGrade) {
        throw new Error('The AI could not suggest a subject, grade or book type. Add more details and try again.')
      }

      setNewTitle((current) => ({
        ...current,
        subject_id: current.subject_id || suggestedSubject?.id || '',
        grade_level: current.grade_level || suggestedGrade,
        type: !typeManuallySelected && suggestedType ? suggestedType : current.type,
      }))
      setAiMessage('Suggestions were added to empty fields. Review them before saving.')
    } catch (err: any) {
      setFormError(err?.message || 'Could not get AI catalog suggestions.')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newTitle.title.trim()) {
      setFormError('Title is required.')
      return
    }

    let titleId = createdTitleId
    let titleCreatedDuringSubmit = false
    try {
      if (!titleId) {
        const created = await createTitle.mutateAsync({
          title: newTitle.title.trim(),
          subtitle: newTitle.subtitle.trim() || null,
          author: newTitle.author.trim(),
          isbn10: newTitle.isbn10.trim() || null,
          isbn13: newTitle.isbn13.trim() || null,
          publisher: newTitle.publisher.trim() || null,
          year: Number(newTitle.year) || null,
          edition: newTitle.edition.trim() || null,
          language: newTitle.language.trim() || 'English',
          subject_id: newTitle.subject_id || null,
          grade_level: newTitle.grade_level.trim() || null,
          type: newTitle.type,
          description: newTitle.description.trim() || null,
        })
        titleId = created.id
        titleCreatedDuringSubmit = true
        setCreatedTitleId(created.id)
      }

      if (firstCopyBarcode.trim()) {
        await addCopy.mutateAsync({
          title_id: titleId,
          barcode: firstCopyBarcode.trim(),
          location_id: firstCopyLocation || undefined,
        })
      }

      setAddDialogOpen(false)
      navigate(`/catalog/${titleId}`)
    } catch (err: any) {
      const message = err?.message || 'The catalog record could not be saved.'
      setFormError(
        titleCreatedDuringSubmit || createdTitleId
          ? `Title saved, but the first copy was not added: ${message} Correct the barcode and try again.`
          : message
      )
    }
  }

  const columns: Column<Title>[] = [
    {
      key: 'cover',
      header: 'Cover',
      width: '60px',
      accessor: (row) => (
        <div className="flex h-12 w-9 items-center justify-center rounded bg-surface-2 text-faint overflow-hidden shadow-sm">
          {row.cover_url ? (
            <img src={row.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title & Author',
      sortable: true,
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-heading hover:text-primary transition-colors">
            {row.title}
          </span>
          <span className="text-xs text-faint">by {row.author || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'isbn',
      header: 'ISBN',
      accessor: (row) => (
        <span className="text-xs text-muted font-mono">
          {row.isbn13 || row.isbn10 || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      accessor: (row) => {
        const variantMap: Record<BookType, 'info' | 'success' | 'warning'> = {
          textbook: 'info',
          library: 'success',
          reference: 'warning',
        }
        return (
          <Badge variant={variantMap[row.type as BookType] || 'gray'} size="sm">
            {row.type}
          </Badge>
        )
      },
    },
    {
      key: 'subject',
      header: 'Subject',
      accessor: (row) => (
        <span className="text-xs text-muted">
          {row.subject?.name || '—'}
        </span>
      ),
    },
    {
      key: 'copies',
      header: 'Availability',
      align: 'center',
      accessor: (row) => {
        const avail = row.available_copies_count ?? 0
        const total = row.total_copies_count ?? 0
        return (
          <span
            className={`text-xs font-semibold ${
              avail > 0 ? 'text-success-700 dark:text-success' : 'text-danger'
            }`}
          >
            {avail} / {total} available
          </span>
        )
      },
    },
  ]

  const totalCopies = (titles || []).reduce(
    (sum, title) => sum + (title.total_copies_count ?? 0),
    0
  )
  const availableCopies = (titles || []).reduce(
    (sum, title) => sum + (title.available_copies_count ?? 0),
    0
  )
  const onLoanCopies = Math.max(0, totalCopies - availableCopies)

  const collectionStats = [
    {
      label: 'Titles in view',
      value: titles?.length ?? 0,
      icon: BookMarked,
      tint: 'border-teal-400/20 bg-teal-400/10 text-accent',
    },
    {
      label: 'Total copies',
      value: totalCopies,
      icon: Layers,
      tint: 'border-sky-400/20 bg-sky-400/10 text-sky-accent',
    },
    {
      label: 'On shelf',
      value: availableCopies,
      icon: BookOpen,
      tint: 'border-emerald-400/20 bg-emerald-400/10 text-positive',
    },
    {
      label: 'On loan',
      value: onLoanCopies,
      icon: ArrowUpRight,
      tint: 'border-amber-400/20 bg-amber-400/10 text-caution',
    },
  ]

  const hasActiveFilters =
    !!filters.search ||
    !!filters.subjectId ||
    (filters.bookType && filters.bookType !== 'all') ||
    (filters.availability && filters.availability !== 'all')

  const clearFilters = () =>
    setFilters({ search: '', bookType: 'all', availability: 'all' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-accent">
            <Library className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-heading sm:text-2xl">Book Catalog</h2>
            <p className="mt-0.5 text-sm text-muted">
              Find a title, check its copies, and keep the shelves in order.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenAddDialog}
        >
          Add Title
        </Button>
      </div>

      {/* Collection Snapshot */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {collectionStats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-line bg-panel/60 p-4"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${stat.tint}`}
            >
              <stat.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
                {stat.label}
              </p>
              <p className="text-lg font-semibold leading-tight text-heading">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-line bg-panel/60 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Input
              placeholder="Search by title, author, ISBN..."
              leftAddon={<Search className="h-4 w-4" />}
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="lg:col-span-3">
            <Combobox
              options={[
                { value: 'all', label: 'All Subjects' },
                ...(subjects || []).map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={filters.subjectId || 'all'}
              placeholder="All Subjects"
              searchPlaceholder="Search subjects..."
              createOption={{
                label: 'Add subject',
                placeholder: 'New subject name...',
                onCreate: handleQuickAddSubject,
              }}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  subjectId: value === 'all' ? undefined : String(value),
                }))
              }
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'textbook', label: 'Textbook' },
                { value: 'library', label: 'Library Book' },
                { value: 'reference', label: 'Reference' },
              ]}
              value={filters.bookType || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  bookType: e.target.value as any,
                }))
              }
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              options={[
                { value: 'all', label: 'All Availability' },
                { value: 'available', label: 'In Stock Only' },
              ]}
              value={filters.availability || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  availability: e.target.value as any,
                }))
              }
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-xs text-faint">
              <span className="font-semibold text-body">{titles?.length ?? 0}</span>{' '}
              {titles?.length === 1 ? 'title matches' : 'titles match'} your filters
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Titles Table */}
      <DataTable
        data={titles || []}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => navigate(`/catalog/${row.id}`)}
        emptyTitle="No titles match your search"
        emptyMessage="Try adjusting your filters or add a new title to the catalog."
        emptyAction={{
          label: 'Add New Title',
          onClick: handleOpenAddDialog,
        }}
        rowActions={(row) => [
          {
            label: 'View details & copies',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => navigate(`/catalog/${row.id}`),
          },
        ]}
      />

      {/* Add Title Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogHeader>
          <DialogTitle>{createdTitleId ? 'Add First Copy' : 'Add New Title'}</DialogTitle>
          <DialogDescription>
            {createdTitleId
              ? 'The title is saved. Add a barcode for its first physical copy, or finish without adding one.'
              : 'Enter book details, then add a barcode if you already have a copy ready.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateSubmit}>
          <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {formError && (
              <div className="rounded-md bg-danger-50 p-3 text-xs text-danger font-medium">
                {formError}
              </div>
            )}

            {!createdTitleId && (
              <>
                <div className="flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                        Catalog suggestions
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-primary-800 dark:text-primary-200">
                        AI can suggest a subject, grade and book type from the title and author. Review every suggestion.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={isSuggesting}
                    disabled={!newTitle.title.trim() || isSuggesting}
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={handleAiSuggest}
                    className="shrink-0"
                  >
                    Suggest with AI
                  </Button>
                </div>
                {aiMessage && (
                  <p className="text-xs text-primary-700 dark:text-primary-300">{aiMessage}</p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={newTitle.title}
                onChange={(e) => setNewTitle({ ...newTitle, title: e.target.value })}
                placeholder="e.g. Platinum Mathematics Grade 9"
              />

              <Input
                label="Author(s)"
                value={newTitle.author}
                onChange={(e) => setNewTitle({ ...newTitle, author: e.target.value })}
                placeholder="e.g. J. Campbell, M. Sithole"
              />

              <Input
                label="Subtitle"
                value={newTitle.subtitle}
                onChange={(e) => setNewTitle({ ...newTitle, subtitle: e.target.value })}
                placeholder="Learner's Book"
              />

              <Select
                label="Book Type"
                options={[
                  { value: 'textbook', label: 'Textbook' },
                  { value: 'library', label: 'Library Book' },
                  { value: 'reference', label: 'Reference' },
                ]}
                value={newTitle.type}
                onChange={(e) => {
                  setTypeManuallySelected(true)
                  setNewTitle({ ...newTitle, type: e.target.value as BookType })
                }}
              />

              <Input
                label="ISBN-13"
                value={newTitle.isbn13}
                onChange={(e) => setNewTitle({ ...newTitle, isbn13: e.target.value })}
                placeholder="978-0-..."
              />

              <Input
                label="ISBN-10"
                value={newTitle.isbn10}
                onChange={(e) => setNewTitle({ ...newTitle, isbn10: e.target.value })}
                placeholder="0-..."
              />

              <Combobox
                label="Subject"
                options={[
                  { value: '', label: 'Select Subject...' },
                  ...(subjects || []).map((s) => ({ value: s.id, label: s.name })),
                ]}
                value={newTitle.subject_id}
                placeholder="Select Subject..."
                searchPlaceholder="Search subjects..."
                createOption={{
                  label: 'Add subject',
                  placeholder: 'New subject name...',
                  onCreate: handleQuickAddSubject,
                }}
                onChange={(value) => setNewTitle({ ...newTitle, subject_id: String(value) })}
              />

              <Input
                label="Grade Level"
                value={newTitle.grade_level}
                onChange={(e) => setNewTitle({ ...newTitle, grade_level: e.target.value })}
                placeholder="Grade 9"
              />

              <Input
                label="Publisher"
                value={newTitle.publisher}
                onChange={(e) => setNewTitle({ ...newTitle, publisher: e.target.value })}
                placeholder="Pearson"
              />

              <Input
                label="Publication Year"
                type="number"
                value={newTitle.year}
                onChange={(e) => setNewTitle({ ...newTitle, year: Number(e.target.value) })}
              />
                </div>
              </>
            )}

            <div className="border-t border-line pt-4">
              <p className="text-sm font-semibold text-body">
                First copy <span className="font-normal text-faint">(optional)</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Add a barcode now, or add copies later from the title page.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Barcode"
                  value={firstCopyBarcode}
                  onChange={(e) => setFirstCopyBarcode(e.target.value)}
                  placeholder="Scan or type a barcode"
                />
                <Select
                  label="Shelf location"
                  options={[
                    { value: '', label: 'Choose later' },
                    ...(locations || []).map((location) => ({
                      value: location.id,
                      label: location.name,
                    })),
                  ]}
                  value={firstCopyLocation}
                  onChange={(e) => setFirstCopyLocation(e.target.value)}
                />
              </div>
            </div>
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
              loading={createTitle.isPending || addCopy.isPending}
            >
              {createdTitleId ? 'Finish and open title' : 'Save title'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
