import React, { useState, useRef, useEffect, useId } from 'react'
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
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
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const selectedValues = Array.isArray(value) ? value : value ? [value] : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const filteredOptions = onSearchChange
    ? options
    : options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
      )

  const selectedOptions = options.filter((o) => selectedValues.includes(o.value))

  return (
    <div ref={containerRef} className={cn('relative w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          'min-h-[40px] w-full flex items-center justify-between rounded-button border border-slate-300 bg-white px-3 py-1.5 text-left text-sm text-slate-900 transition-colors',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800',
          error && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-2">
          {multiple && selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200"
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
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          {/* Search Input inside popover */}
          <div className="border-b border-slate-200 dark:border-slate-700 p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1 text-sm">
            {loading ? (
              <div className="flex items-center justify-center p-4 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Loading options...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">{emptyText}</div>
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
                        ? 'bg-primary-50 text-primary-900 dark:bg-primary-950 dark:text-primary-200 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-slate-400">{option.sublabel}</span>
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
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}
