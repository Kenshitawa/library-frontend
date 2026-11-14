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
  const accent = data.kind === 'issue' ? [15, 118, 110] : [37, 99, 102]
  const heading = data.kind === 'issue' ? 'BOOK ISSUE RECEIPT' : 'BOOK RETURN RECEIPT'

  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(0, 0, width, 43, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(data.libraryName || 'School Library', margin, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const address = [data.libraryAddress, data.libraryPhone].filter(Boolean).join('  |  ')
  if (address) doc.text(doc.splitTextToSize(address, width - margin * 2), margin, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(heading, margin, 35)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Receipt ${data.receiptNumber}`, right, 35, { align: 'right' })

  let y = 55
  const field = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(value || '—', width - margin * 2 - 35)
    doc.text(lines, margin + 35, y)
    y += Math.max(8, lines.length * 5 + 2)
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y - 2, right, y - 2)
  }

  field('Borrower', data.borrowerName)
  field('Learner number', data.borrowerNumber)
  if (data.className) field('Class', data.className)
  field('Book', data.title)
  field('Barcode', data.barcode)
  field('Issued', formatDateTime(data.issuedAt))
  field('Due date', formatDate(data.dueAt))
  if (data.kind === 'return') {
    field('Returned', data.returnedAt ? formatDateTime(data.returnedAt) : '—')
    field('Condition', data.condition || 'Good')
    if (data.daysLate && data.daysLate > 0) field('Days overdue', String(data.daysLate))
  }
  if (data.processedBy) field('Processed by', data.processedBy)

  y += 3
  doc.setFillColor(240, 249, 248)
  doc.roundedRect(margin, y, width - margin * 2, 15, 2, 2, 'F')
  doc.setTextColor(15, 78, 76)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const note = data.kind === 'issue'
    ? 'Keep this receipt and return the book by the due date shown above.'
    : 'This receipt confirms that the book has been checked back into the library.'
  doc.text(doc.splitTextToSize(note, width - margin * 2 - 8), margin + 4, y + 6)
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
