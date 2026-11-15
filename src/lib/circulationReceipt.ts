import { jsPDF } from 'jspdf'
import { formatDate, formatDateTime } from '@/lib/utils'

export interface CirculationReceiptData {
  kind: 'issue' | 'return'
  receiptNumber: string
  libraryName: string
  libraryAddress?: string | null
  libraryPhone?: string | null
  borrowerName: string
  borrowerNumber: string
  className?: string | null
  title: string
  barcode: string
  issuedAt: string
  dueAt: string
  returnedAt?: string
  condition?: string
  daysLate?: number
  processedBy?: string | null
}

export interface PickupWarningLetterData {
  libraryName: string
  libraryAddress?: string | null
  borrowerName: string
  borrowerNumber?: string | null
  subject: string
  body: string
  createdAt: string
}

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function createCirculationPdf(data: CirculationReceiptData): jsPDF {
  const doc = new jsPDF({ format: 'a5', unit: 'mm' })
  const width = doc.internal.pageSize.getWidth()
  const margin = 14
  const right = width - margin
  const accent = data.kind === 'issue' ? [16, 111, 99] : [27, 116, 78]
  const heading = data.kind === 'issue' ? 'BOOK ISSUE' : 'BOOK RETURN'
  const contentWidth = width - margin * 2

  // Clean, print-friendly masthead with a visible receipt reference.
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(0, 0, width, 48, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, 10, 10, 10, 2, 2, 'F')
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(0.8)
  doc.line(margin + 3, 12, margin + 3, 18)
  doc.line(margin + 5, 12, margin + 5, 18)
  doc.line(margin + 7, 12, margin + 7, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(doc.splitTextToSize(data.libraryName || 'School Library', contentWidth - 18), margin + 14, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const address = [data.libraryAddress, data.libraryPhone].filter(Boolean).join('  ·  ')
  if (address) doc.text(doc.splitTextToSize(address, contentWidth - 14), margin + 14, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(heading, margin, 39)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`RECEIPT  ${data.receiptNumber}`, right, 39, { align: 'right' })

  let y = 54
  const label = (text: string, x: number, top: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(105, 124, 116)
    doc.setFontSize(7)
    doc.text(text.toUpperCase(), x, top)
  }
  const value = (text: string, x: number, top: number, maxWidth: number, size = 9) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(27, 43, 36)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text || '—', maxWidth)
    doc.text(lines, x, top)
    return lines.length
  }
  const separator = (top: number) => {
    doc.setDrawColor(223, 232, 226)
    doc.setLineWidth(0.25)
    doc.line(margin, top, right, top)
  }

  label('Borrower', margin, y)
  const borrowerLines = value(data.borrowerName, margin, y + 6, contentWidth, 12)
  y += Math.max(12, borrowerLines * 4 + 8)
  const half = (contentWidth - 8) / 2
  label('Admission / staff ID', margin, y)
  label('Class / department', margin + half + 8, y)
  value(data.borrowerNumber, margin, y + 5, half)
  value(data.className || '—', margin + half + 8, y + 5, half)
  y += 12
  separator(y)
  y += 7

  doc.setFillColor(239, 247, 242)
  doc.roundedRect(margin, y - 4, contentWidth, 26, 2, 2, 'F')
  label('Book title', margin + 4, y + 1)
  const titleLines = value(data.title, margin + 4, y + 7, contentWidth - 8, 9.5)
  label('Barcode', margin + 4, y + 18)
  value(data.barcode, margin + 27, y + 18, contentWidth - 32, 7.5)
  y += Math.max(29, titleLines * 4 + 26)

  label('Issued', margin, y)
  label(data.kind === 'issue' ? 'Return by' : 'Original due date', margin + half + 8, y)
  value(formatDateTime(data.issuedAt), margin, y + 5, half, 8.5)
  value(formatDate(data.dueAt), margin + half + 8, y + 5, half, 8.5)
  y += 13
  if (data.kind === 'return') {
    label('Checked in', margin, y)
    label('Condition', margin + half + 8, y)
    value(data.returnedAt ? formatDateTime(data.returnedAt) : '—', margin, y + 5, half, 8.5)
    value(data.condition || 'Good', margin + half + 8, y + 5, half, 8.5)
    y += 13
    if (data.daysLate && data.daysLate > 0) {
      label('Days overdue', margin, y)
      value(String(data.daysLate), margin, y + 5, half)
      y += 11
    }
  }
  if (data.processedBy) {
    separator(y)
    y += 6
    label('Processed by', margin, y)
    value(data.processedBy, margin, y + 6, contentWidth)
    y += 11
  }

  const pageHeight = doc.internal.pageSize.getHeight()
  const noteY = Math.min(y + 3, pageHeight - 26)
  doc.setFillColor(248, 250, 249)
  doc.roundedRect(margin, noteY, contentWidth, 13, 2, 2, 'F')
  doc.setTextColor(62, 86, 75)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const note = data.kind === 'issue'
    ? 'Please return this book by the due date above. Keep this receipt for your records.'
    : 'This receipt confirms the book has been checked back into the library.'
  doc.text(doc.splitTextToSize(note, contentWidth - 8), margin + 4, noteY + 5)
  doc.setTextColor(110, 126, 117)
  doc.setFontSize(6.5)
  doc.text('School Library · Circulation Record', width / 2, pageHeight - 7, { align: 'center' })
  return doc
}

export function downloadCirculationReceipt(data: CirculationReceiptData): void {
  const doc = createCirculationPdf(data)
  doc.save(`library-${data.kind}-receipt-${safeFilename(data.receiptNumber)}.pdf`)
}

export function printCirculationReceipt(data: CirculationReceiptData): void {
  const doc = createCirculationPdf(data)
  const printWindow = window.open(doc.output('bloburl').toString(), '_blank')
  if (!printWindow) {
    throw new Error('The receipt could not open because pop-ups are blocked. Allow pop-ups or download the PDF instead.')
  }
}

export function downloadPickupWarningLetter(data: PickupWarningLetterData): void {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const margin = 20
  const width = doc.internal.pageSize.getWidth()
  const contentWidth = width - margin * 2

  doc.setFillColor(15, 78, 76)
  doc.rect(0, 0, width, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(data.libraryName || 'School Library', margin, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (data.libraryAddress) doc.text(doc.splitTextToSize(data.libraryAddress, contentWidth), margin, 23)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(formatDate(data.createdAt), margin, 48)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(data.subject || 'Reservation pickup notice', margin, 64)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let y = 78
  const greeting = `To: ${data.borrowerName}${data.borrowerNumber ? ` (${data.borrowerNumber})` : ''}`
  doc.text(doc.splitTextToSize(greeting, contentWidth), margin, y)
  y += 10
  const lines = doc.splitTextToSize(data.body || '', contentWidth)
  doc.text(lines, margin, y, { lineHeightFactor: 1.6 })
  doc.save(`library-pickup-warning-${safeFilename(data.borrowerNumber || data.borrowerName)}.pdf`)
}
