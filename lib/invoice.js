// ─────────────────────────────────────────────────────────────────────
// Invoice PDF generator — Staples Invoice Facture style
// Uses jsPDF
// ─────────────────────────────────────────────────────────────────────

export const COMPANY = {
  name:    'INDIMOE Cleaning',
  address: '48 Castleridge Crescent NE, Calgary, AB T3J 1N7',
  cell:    '403-708-0886',
  email:   'mohan_singh2010@rediffmail.com',
  taxReg:  '73762-9089RT0001',
}

// Converts a number to words (Canadian English, handles up to 999,999)
export function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function belowThousand(n) {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
    return ones[Math.floor(n / 100)] + ' Hundred ' + belowThousand(n % 100)
  }

  const dollars = Math.floor(amount)
  const cents   = Math.round((amount - dollars) * 100)

  let words = ''
  if (dollars >= 1000) words += belowThousand(Math.floor(dollars / 1000)) + 'Thousand '
  words += belowThousand(dollars % 1000)
  words = words.trim()
  if (cents > 0) words += ` and ${cents}/100`
  words += ' Dollars Only'
  return words.trim()
}

export async function generateInvoicePDF(invoice) {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const W = 215.9
  const margin = 14

  // ── Header ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(COMPANY.name, margin, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(COMPANY.address, margin, 24)
  doc.text(`Cell: ${COMPANY.cell}   Email: ${COMPANY.email}`, margin, 29)

  // INVOICE / FACTURE title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('INVOICE / FACTURE', W - margin, 18, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, W - margin, 24, { align: 'right' })
  doc.text(`Date: ${invoice.date}`, W - margin, 29, { align: 'right' })

  // Divider
  doc.setDrawColor(180)
  doc.line(margin, 33, W - margin, 33)

  // ── Sold To / Tax Reg ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Sold To / Vendu à:', margin, 40)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.clientName, margin, 46)
  doc.text(invoice.clientAddress, margin, 51)

  doc.setFont('helvetica', 'bold')
  doc.text('Tax Reg. No. / No. d\'enr. fiscal:', W / 2, 40)
  doc.setFont('helvetica', 'normal')
  doc.text(COMPANY.taxReg, W / 2, 46)

  if (invoice.poNumber) {
    doc.setFont('helvetica', 'bold')
    doc.text('P.O. / Bon de commande:', W / 2, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.poNumber, W / 2, 57)
  }

  // ── Line items table ──────────────────────────────────────────────
  doc.autoTable({
    startY: 65,
    margin: { left: margin, right: margin },
    head: [[
      { content: 'Qty\nQté',        styles: { halign: 'center', cellWidth: 15 } },
      { content: 'Description',     styles: { halign: 'left' } },
      { content: 'Unit Price\nPrix unitaire', styles: { halign: 'right', cellWidth: 35 } },
      { content: 'Amount\nMontant', styles: { halign: 'right', cellWidth: 35 } },
    ]],
    body: invoice.items.map(item => [
      { content: item.qty,         styles: { halign: 'center' } },
      { content: item.description, styles: { halign: 'left' } },
      { content: `$${Number(item.unitPrice).toFixed(2)}`, styles: { halign: 'right' } },
      { content: `$${(item.qty * item.unitPrice).toFixed(2)}`, styles: { halign: 'right' } },
    ]),
    headStyles:  { fillColor: [29, 158, 117], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:  { fontSize: 9, minCellHeight: 8 },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.3,
  })

  // ── Totals ────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 4
  const subtotal = invoice.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const gst   = subtotal * 0.05
  const hst   = 0   // Alberta has no PST/HST, only GST
  const total = subtotal + gst + hst

  const totalsX = W - margin - 70
  const valX    = W - margin

  const addRow = (label, value, bold = false) => {
    const y = doc.lastAutoTable.finalY + (addRow._offset || 8)
    addRow._offset = (addRow._offset || 8) + 6
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.text(label, totalsX, y)
    doc.text(value, valX, y, { align: 'right' })
  }

  addRow('Subtotal:', `$${subtotal.toFixed(2)}`)
  addRow('GST/TPS (5%):', `$${gst.toFixed(2)}`)
  addRow('HST/TVH (0% — AB):', `$0.00`)

  // Total line
  const totalY = doc.lastAutoTable.finalY + (addRow._offset || 8) + 2
  doc.setDrawColor(29, 158, 117)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalY - 3, W - margin, totalY - 3)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL:', totalsX, totalY + 4)
  doc.text(`$${total.toFixed(2)}`, valX, totalY + 4, { align: 'right' })

  // Amount in words
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(80)
  doc.text(`Amount in words: ${numberToWords(total)}`, margin, totalY + 4)
  doc.setTextColor(0)

  // ── Footer ────────────────────────────────────────────────────────
  const footY = 260
  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(margin, footY, W - margin, footY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Thank you for your business! / Merci pour votre confiance!', W / 2, footY + 5, { align: 'center' })
  doc.text(`${COMPANY.name} · ${COMPANY.cell} · ${COMPANY.email}`, W / 2, footY + 10, { align: 'center' })

  doc.save(`INDIMOE_Invoice_${invoice.invoiceNumber}.pdf`)
}
