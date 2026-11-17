import React, { useState, useRef, useEffect, useId } from 'react'
import { Check, ChevronsUpDown, X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
}

export interface ComboboxCreateOption {
  /** Name for the quick-add button, e.g. "Add subject". */
  label?: string
  /** Placeholder for the inline name field. */
  placeholder?: string
  /**
   * Creates the option and returns the value to select. When an option already
   * exists, return its value to select it instead of creating a duplicate.
   */
  onCreate: (name: string) => Promise<string | void> | string | void
}

export interface ComboboxProps {
  label?: string
  error?: string
  description?: string
  options: ComboboxOption[]
  value?: string | string[]
  onChange: (value: string | string[]) => void
  onSearchChange?: (query: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  multiple?: boolean
  disabled?: boolean
  className?: string
  required?: boolean
  createOption?: ComboboxCreateOption
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  error,
  description,
  options,
  value,
  onChange,
  onSearchChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No items found.',
  loading = false,
  multiple = false,
  disabled = false,
  className,
  required,
  createOption,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdOptions, setCreatedOptions] = useState<ComboboxOption[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const selectedValues = Array.isArray(value) ? value : value ? [value] : []

  // Options created in this session render immediately while the list refetches.
  const allOptions = [
    ...options,
    ...createdOptions.filter((created) => !options.some((o) => o.value === created.value)),
  ]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) {
      setCreating(false)
      setCreateName('')
      setCreateError(null)
      setSearch('')
    }
  }, [open])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    onSearchChange?.(val)
  }

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const next = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue]
      onChange(next)
    } else {
      onChange(optionValue)
      setOpen(false)
      setSearch('')
    }
  }

  const handleRemove = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation()
    onChange(selectedValues.filter((v) => v !== optionValue))
  }

  const startCreating = (initialName?: string) => {
    setCreating(true)
    setCreateName(initialName ?? search)
    setCreateError(null)
    setTimeout(() => createInputRef.current?.focus(), 0)
  }

  const cancelCreating = () => {
    setCreating(false)
    setCreateName('')
    setCreateError(null)
  }

  const handleCreate = async () => {
    if (!createOption || createBusy) return

    const name = createName.trim()
    if (!name) {
      setCreateError('Enter a name first.')
      return
    }

    setCreateBusy(true)
    setCreateError(null)
    try {
      const createdValue = await createOption.onCreate(name)
      if (typeof createdValue === 'string' && createdValue) {
        setCreatedOptions((prev) =>
          prev.some((o) => o.value === createdValue)
            ? prev
            : [...prev, { value: createdValue, label: name }]
        )
        if (multiple) {
          onChange([...selectedValues.filter((v) => v !== createdValue), createdValue])
        } else {
          onChange(createdValue)
          setOpen(false)
        }
      }
      cancelCreating()
      setSearch('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create this option.')
    } finally {
      setCreateBusy(false)
    }
  }

  const filteredOptions = onSearchChange
    ? allOptions
    : allOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
      )

  const selectedOptions = allOptions.filter((o) => selectedValues.includes(o.value))

  return (
    <div ref={containerRef} className={cn('relative w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-body">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }}
        className={cn(
          'min-h-[40px] w-full flex items-center justify-between rounded-lg border border-line-strong bg-surface-1 px-3 py-1.5 text-left text-sm text-body transition-colors',
          'focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10',
          'disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-faint',
          error && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-2">
          {multiple && selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-xs font-medium text-body"
              >
                {opt.label}
                <X
                  className="h-3 w-3 hover:text-danger cursor-pointer"
                  onClick={(e) => handleRemove(e, opt.value)}
                />
              </span>
            ))
          ) : !multiple && selectedOptions.length > 0 ? (
            <span className="truncate">{selectedOptions[0].label}</span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-line bg-panel shadow-[0_18px_50px_-28px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Search Input inside popover */}
          <div className="border-b border-line p-2">
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface-1 px-2.5 py-1.5 text-xs text-body focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10"
              />
              {createOption && (
                <button
                  type="button"
                  onClick={() => (creating ? cancelCreating() : startCreating())}
                  aria-label={createOption.label || 'Add new option'}
                  title={createOption.label || 'Add new option'}
                  aria-expanded={creating}
                  className={cn(
                    'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/10 text-accent transition-colors hover:bg-teal-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40',
                    creating && 'border-teal-400/50 bg-teal-400/20'
                  )}
                >
                  <Plus className={cn('h-4 w-4 transition-transform', creating && 'rotate-45')} />
                </button>
              )}
            </div>

            {createOption && creating && (
              <div className="mt-2 rounded-lg border border-line bg-surface-1 p-2">
                <input
                  ref={createInputRef}
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleCreate()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelCreating()
                    }
                  }}
                  placeholder={createOption.placeholder || 'New name...'}
                  className="w-full rounded-md border border-line-strong bg-panel px-2.5 py-1.5 text-xs text-body focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10"
                />
                {createError && <p className="mt-1.5 text-[11px] font-medium text-danger">{createError}</p>}
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={cancelCreating}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={createBusy}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                  >
                    {createBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1 text-sm">
            {loading ? (
              <div className="flex items-center justify-center p-4 text-muted">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Loading options...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-1">
                {createOption && search.trim() && (
                  <button
                    type="button"
                    onClick={() => startCreating(search)}
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-accent transition-colors hover:bg-surface-2"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      Create &ldquo;{search.trim()}&rdquo;
                    </span>
                  </button>
                )}
                <div className="p-3 text-center text-xs text-muted">{emptyText}</div>
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <div
                    key={option.value}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={cn(
                      'flex items-center justify-between rounded px-2.5 py-2 text-sm cursor-pointer select-none transition-colors',
                      isSelected
                        ? 'bg-teal-400/10 text-accent font-medium'
                        : 'hover:bg-surface-2 text-body',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-muted">{option.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {description && !error && (
        <p className="text-[11px] text-faint">{description}</p>
      )}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}
