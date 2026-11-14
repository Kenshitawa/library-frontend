# UI Design System & Component Guide

## Overview
This design system powers the School Library and Textbook Management System. Built with **Tailwind CSS**, **Lucide Icons**, and **Inter** typography, it offers clean accessibility, fast desk-side interactions, and responsive layouts across desktop, tablet, and mobile.

---

## 1. Color Palette

### Primary (Teal Brand Palette)
- `primary-50`: `#f0fdfa` (background tints)
- `primary-100`: `#ccfbf1` (soft badges, highlights)
- `primary-500`: `#14b8a6` (accent / focus rings)
- `primary-600`: `#0d9488` (interactive hover)
- `primary-700`: `#0f766e` (DEFAULT brand color)
- `primary-900`: `#134e4a` (text on light backgrounds)

### Semantic Colors
- **Success**: `#16a34a` (Returned, Available, Paid)
- **Warning**: `#d97706` (Due soon, Waiting, Partial)
- **Danger**: `#dc2626` (Overdue, Lost, Damaged, Cancelled)
- **Info**: `#2563eb` (Reserved, Information badges)

---

## 2. Typography
- **Font Family**: Inter (`'Inter', system-ui, sans-serif`)
- **Sizes**:
  - `text-xs`: Helper text, timestamps, table sub-labels
  - `text-sm`: Body text, form labels, table cells, navigation links
  - `text-base`: Card body text, dialog contents
  - `text-lg`: Card titles, modal titles
  - `text-2xl`: Page headings, metric highlights

---

## 3. Elevation & Radius
- **Card Radius**: `rounded-card` (`12px` / `0.75rem`)
- **Button Radius**: `rounded-button` (`8px` / `0.5rem`)
- **Shadows**:
  - Card default: `shadow-card` (`0 1px 3px 0 rgb(0 0 0 / 0.1)`)
  - Card hover: `shadow-card-hover` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`)

---

## 4. Components Checklist
- `Button`: Primary, Secondary, Ghost, Danger, Success with loading state and icons.
- `Input`: Label, description, error text, prefix/suffix adornments.
- `Select` & `Combobox`: Searchable selection for borrowers, titles, and classes.
- `Badge`: Semantic status badges displaying icon + text label (never color alone).
- `DataTable`: Sortable, searchable, paginated table with row actions and selection bar.
- `Dialog` & `Sheet`: Accessible modal and slide-over panels with focus trap.
- `StatCard`: Large stat counter with trend indicator.
