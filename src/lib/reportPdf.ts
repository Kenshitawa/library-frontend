import { jsPDF } from 'jspdf'
import { formatDateTime } from '@/lib/utils'

export interface ReportPdfData {
  libraryName: string
  libraryAddress?: string | null
  libraryPhone?: string | null
  title: string
  generatedAt: Date
  filters: string[]
  headers: string[]
  rows: Array<Array<string | number>>
  metrics: Array<{ label: string; value: number }>
}

const BRAND: [number, number, number] = [15, 78, 76]
const BRAND_LIGHT: [number, number, number] = [236, 247, 245]
const BRAND_LINE: [number, number, number] = [205, 232, 227]
const TEXT: [number, number, number] = [15, 23, 42]
const MUTED: [number, number, number] = [100, 116, 139]
const RULE: [number, number, number] = [226, 232, 240]
const ZEBRA: [number, number, number] = [249, 251, 252]

function columnMinimum(header: string): number {
  const key = header.toLowerCase()
  if (key.includes('barcode')) return 25
  if (key.includes('isbn')) return 21
  if (key.includes('borrower no')) return 21
  if (key.includes('call')) return 18
  if (key.includes('title')) return 29
  if (key.includes('author')) return 28
  if (key.includes('subject')) return 27
  if (key.includes('borrower')) return 27
  if (key.includes('location')) return 27
  if (key.includes('class')) return 23
  if (key.includes('date') || key.includes('acquired')) return 19
  if (key.includes('condition')) return 18
  if (key.includes('price')) return 16
  if (key.includes('status')) return 16
  if (key.includes('type')) return 15
  return 13
}

function columnWeight(header: string): number {
  const key = header.toLowerCase()
  if (/title|author|subject|location/.test(key)) return 3
  if (/borrower/.test(key) && !key.includes('borrower no')) return 3
  if (/class|barcode|isbn|call|condition/.test(key)) return 1.5
  return 1
}

function columnWidths(headers: string[], contentWidth: number): number[] {
  const minimums = headers.map(columnMinimum)
  const minimumTotal = minimums.reduce((sum, width) => sum + width, 0)
  if (minimumTotal >= contentWidth) {
    return minimums.map((width) => (width / minimumTotal) * contentWidth)
  }

  const weights = headers.map(columnWeight)
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  const extra = contentWidth - minimumTotal
  return minimums.map((minimum, index) => minimum + (extra * weights[index]) / weightTotal)
}

function wrap(doc: jsPDF, value: string | number | null | undefined, width: number): string[] {
  const text = value === null || value === undefined ? '' : String(value)
  if (!text) return ['']
  return doc.splitTextToSize(text, Math.max(width, 4)) as string[]
}

function drawFirstPageHeader(doc: jsPDF, data: ReportPdfData, pageWidth: number, margin: number): number {
  const contentWidth = pageWidth - margin * 2

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageWidth, 25, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(data.libraryName || 'School Library', margin, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const contact = [data.libraryAddress, data.libraryPhone].filter(Boolean).join('  •  ')
  if (contact) {
    doc.text(doc.splitTextToSize(contact, contentWidth * 0.55) as string[], margin, 17.5)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('LIBRARY REPORT', pageWidth - margin, 9.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Generated ${formatDateTime(data.generatedAt.toISOString())}`, pageWidth - margin, 15.5, {
    align: 'right',
  })

  doc.setTextColor(...TEXT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(data.title, margin, 35)

  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const filterLines = doc.splitTextToSize(data.filters.join('   •   ') || 'All records', contentWidth)
  doc.text(filterLines as string[], margin, 42)

  let y = 42 + (filterLines as string[]).length * 3.8 + 3

  if (data.metrics.length > 0) {
    const gap = 4
    const cardWidth = (contentWidth - gap * (data.metrics.length - 1)) / data.metrics.length
    const cardHeight = 14

    data.metrics.forEach((metric, index) => {
      const x = margin + index * (cardWidth + gap)
      doc.setFillColor(...BRAND_LIGHT)
      doc.setDrawColor(...BRAND_LINE)
      doc.setLineWidth(0.2)
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD')

      doc.setTextColor(...MUTED)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.text(metric.label.toUpperCase(), x + 3, y + 5)

      doc.setTextColor(...BRAND)
      doc.setFontSize(13)
      doc.text(metric.value.toLocaleString(), x + 3, y + 11.2)
    })

    y += cardHeight
  }

  return y + 7
}

function drawContinuationHeader(
  doc: jsPDF,
  data: ReportPdfData,
  pageWidth: number,
  margin: number
): number {
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageWidth, 12, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(data.title, margin, 7.8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`${data.libraryName || 'School Library'} • continued`, pageWidth - margin, 7.8, {
    align: 'right',
  })

  return 18
}

export function createReportPdf(data: ReportPdfData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = pageWidth - margin * 2
  const fontSize = data.headers.length > 10 ? 6.4 : data.headers.length > 7 ? 7 : 7.6
  const lineHeight = fontSize * 0.44
  const paddingX = fontSize > 7 ? 2.2 : 1.9
  const paddingY = fontSize > 7 ? 1.8 : 1.6
  const bottomLimit = pageHeight - 15

  const widths = columnWidths(data.headers, contentWidth)
  const numericColumn = data.headers.map(
    (_, index) =>
      data.rows.length > 0 &&
      data.rows.every((row) => row[index] === '' || typeof row[index] === 'number')
  )

  const drawTableHeader = (y: number): number => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fontSize)
    const headerLines = data.headers.map((header, index) =>
      wrap(doc, header, widths[index] - paddingX * 2)
    )
    const lineCount = Math.max(...headerLines.map((lines) => lines.length))
    const rowHeight = lineCount * lineHeight + paddingY * 2 + 0.8

    doc.setFillColor(...BRAND)
    doc.rect(margin, y, contentWidth, rowHeight, 'F')

    doc.setTextColor(255, 255, 255)
    let x = margin
    headerLines.forEach((lines, index) => {
      const align = numericColumn[index] ? 'right' : 'left'
      const textX = align === 'right' ? x + widths[index] - paddingX : x + paddingX
      lines.forEach((line, lineIndex) => {
        doc.text(line, textX, y + paddingY + fontSize * 0.32 + lineIndex * lineHeight, {
          align,
        })
      })
      x += widths[index]
    })

    return y + rowHeight
  }

  const drawRow = (row: Array<string | number>, y: number, index: number): number => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    const cellLines = row.map((cell, columnIndex) =>
      wrap(doc, cell, widths[columnIndex] - paddingX * 2)
    )
    const lineCount = Math.max(...cellLines.map((lines) => lines.length))
    const rowHeight = Math.max(
      fontSize * 0.44 + paddingY * 2,
      lineCount * lineHeight + paddingY * 2
    )

    if (index % 2 === 1) {
      doc.setFillColor(...ZEBRA)
      doc.rect(margin, y, contentWidth, rowHeight, 'F')
    }

    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.1)
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight)

    doc.setTextColor(...TEXT)
    let x = margin
    cellLines.forEach((lines, columnIndex) => {
      const align = numericColumn[columnIndex] ? 'right' : 'left'
      const textX = align === 'right' ? x + widths[columnIndex] - paddingX : x + paddingX
      lines.forEach((line, lineIndex) => {
        if (!line) return
        doc.text(line, textX, y + paddingY + fontSize * 0.32 + lineIndex * lineHeight, {
          align,
        })
      })
      x += widths[columnIndex]
    })

    return y + rowHeight
  }

  let y = drawFirstPageHeader(doc, data, pageWidth, margin)
  y = drawTableHeader(y)

  data.rows.forEach((row, index) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    const cellLines = row.map((cell, columnIndex) =>
      wrap(doc, cell, widths[columnIndex] - paddingX * 2)
    )
    const lineCount = Math.max(...cellLines.map((lines) => lines.length))
    const rowHeight = Math.max(
      fontSize * 0.44 + paddingY * 2,
      lineCount * lineHeight + paddingY * 2
    )

    if (y + rowHeight > bottomLimit) {
      doc.addPage()
      y = drawContinuationHeader(doc, data, pageWidth, margin)
      y = drawTableHeader(y)
    }

    y = drawRow(row, y, index)
  })

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)

    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(
      `${data.libraryName || 'School Library'} • ${data.title}`,
      margin,
      pageHeight - 5.5
    )
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 5.5, {
      align: 'right',
    })
  }

  return doc
}

export function printReportPdf(data: ReportPdfData): void {
  const doc = createReportPdf(data)
  ;(doc as any).autoPrint()
  const url = doc.output('bloburl').toString()
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    throw new Error(
      'The print-ready PDF could not open because pop-ups are blocked. Allow pop-ups for this site and try again.'
    )
  }
}
