import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  BookOpen,
  Eye,
  Library,
  Sparkles,
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
  useLocations,
  useCreateTitle,
  useAddCopy,
  type TitleFilters,
} from '@/hooks/useTitles'
import type { Title, BookType } from '@/types'
import { supabase } from '@/lib/supabase'

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
      key: 'title',
      header: 'Books',
      sortable: true,
      accessor: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100 text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <BookOpen className="absolute h-4 w-4" aria-hidden="true" />
            {row.cover_url ? (
              <img
                src={row.cover_url}
                alt={`${row.title} book cover`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : <BookOpen className="h-4 w-4" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 transition-colors hover:text-primary dark:text-slate-100">{row.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{row.publisher || 'Publisher unavailable'} · {row.subject?.name || 'Subject unavailable'} · Grade {row.grade_level || '—'}</p>
          </div>
          <span className={`shrink-0 text-xs font-semibold ${
            (row.available_copies_count ?? 0) > 0 ? 'text-success-700 dark:text-success' : 'text-danger'
          }`}>
            {row.available_copies_count ?? 0}/{row.total_copies_count ?? 0} available
          </span>
        </div>
      ),
    },
  ]

  return (
    <div id="catalog-printable" className="space-y-6">
      <style>{`@page { size: ${localStorage.getItem('library-print-paper-size') === 'Letter' ? 'letter' : 'A4'} portrait; } @media print { body * { visibility: hidden !important; } #catalog-printable, #catalog-printable * { visibility: visible !important; } #catalog-printable { position: absolute; inset: 0; width: 100%; padding: 0; } #catalog-printable .catalog-no-print { display: none !important; } }`}</style>
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-card border border-[#315c4d] bg-[#275344] p-5 text-white shadow-sm dark:border-[#345d4c] dark:bg-[#1d4034] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4c95d] text-[#3d351c]">
            <Library className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Book Catalog</h2>
            <p className="mt-1 text-sm text-white/80">
              Find a title, check its copies, and keep the shelves in order.
            </p>
          </div>
        </div>

        <div className="catalog-no-print flex flex-wrap gap-2">
          <Button variant="outline" className="border-white/40 text-white hover:bg-white/10" onClick={() => window.print()}>
            Print catalog
          </Button>
          <Button variant="outline" className="border-white/40 text-white hover:bg-white/10" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenAddDialog}>
            Add Title
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="catalog-no-print grid grid-cols-1 gap-3 rounded-card border border-[#c3d1b7] bg-[#e2ead9] p-4 shadow-sm dark:border-[#3a5142] dark:bg-[#27392f] sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search by title, author, ISBN..."
          leftAddon={<Search className="h-4 w-4" />}
          value={filters.search || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />

        <Combobox
          options={[
            { value: 'all', label: 'All Subjects' },
            ...(subjects || []).map((s) => ({ value: s.id, label: s.name })),
          ]}
          value={filters.subjectId || 'all'}
          placeholder="All Subjects"
          searchPlaceholder="Search subjects..."
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              subjectId: value === 'all' ? undefined : String(value),
            }))
          }
        />

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

        <Select
          options={[
            { value: 'all', label: 'All Availability' },
            { value: 'available', label: 'Only In Stock (> 0)' },
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

      {/* Titles Table */}
      <DataTable
        data={titles || []}
        columns={columns}
        compact
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

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                First copy <span className="font-normal text-slate-500">(optional)</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
