'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { COMPANY, generateInvoicePDF, numberToWords } from '../../lib/invoice'
import { STORES } from '../../lib/stores'
import styles from './invoices.module.css'

const STORE_CLIENTS = {
  'Country Village':      { address: '508 Country Village Way NE, Calgary, AB T3K 0R2' },
  'Saddletown (36 St)':  { address: '6520 36 St NE Unit 1120, Calgary, AB T3J 4C8' },
  'Taradale (88 Ave)':   { address: '4715 88 Ave NE #1105, Calgary, AB T3J 4E4' },
  'Cornerstone (109 Ave)':{ address: '4100 109 Ave NE Unit 3120, Calgary, AB T3N 2J1' },
  'Savanna':             { address: '30 Savanna Cres NE #1110, Calgary, AB T3J 2E9' },
  'Red Embers':          { address: '235 Red Embers Way NE #3110, Calgary, AB T3N 1E9' },
  'Country Hills Blvd':  { address: '6004 Country Hills Blvd NE #1860, Calgary, AB T3N 1K8' },
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}
function genNum(list) {
  return `INV-${new Date().getFullYear()}-${String(list.length + 1).padStart(3,'0')}`
}

export default function InvoicesPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [store, setStore]     = useState(null)
  const [invoices, setInvoices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [busy, setBusy]       = useState(false)

  const [form, setForm] = useState({
    invoiceNumber: '', date: todayStr(),
    clientName: '', clientAddress: '', poNumber: '',
    description: 'Restaurant cleaning services', qty: 1, unitPrice: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()
    setProfile(p); setStore(p?.store)
    const { data: inv } = await supabase.from('invoices').select('*').eq('store_id', p?.store_id).order('created_at', { ascending: false })
    const list = inv || []
    setInvoices(list)
    setForm(f => ({ ...f, invoiceNumber: genNum(list), clientAddress: STORE_CLIENTS[p?.store?.name]?.address || '' }))
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })) }

  const subtotal = Number(form.qty) * Number(form.unitPrice) || 0
  const gst = +(subtotal * 0.05).toFixed(2)
  const total = +(subtotal + gst).toFixed(2)

  async function handleSave() {
    if (!form.clientName || !form.unitPrice) return
    setSaving(true)
    const { data, error } = await supabase.from('invoices').insert({
      store_id: profile?.store_id, created_by: profile?.id,
      invoice_number: form.invoiceNumber, invoice_date: new Date().toISOString().slice(0,10),
      client_name: form.clientName, client_address: form.clientAddress,
      po_number: form.poNumber, description: form.description,
      qty: Number(form.qty), unit_price: Number(form.unitPrice),
      subtotal, gst, total,
    }).select().single()
    if (!error) {
      const next = [data, ...invoices]
      setInvoices(next); setShowForm(false)
      setForm(f => ({ ...f, invoiceNumber: genNum(next), clientName: '', unitPrice: '', poNumber: '' }))
    }
    setSaving(false)
  }

  async function downloadPDF(inv) {
    setBusy(true)
    await generateInvoicePDF({
      invoiceNumber: inv.invoice_number,
      date: new Date(inv.invoice_date).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'}),
      clientName: inv.client_name, clientAddress: inv.client_address,
      poNumber: inv.po_number,
      items: [{ qty: inv.qty, description: inv.description, unitPrice: inv.unit_price }],
    })
    setBusy(false)
  }

  async function previewPDF() {
    setBusy(true)
    await generateInvoicePDF({
      invoiceNumber: form.invoiceNumber, date: form.date,
      clientName: form.clientName || 'Client Name', clientAddress: form.clientAddress,
      poNumber: form.poNumber,
      items: [{ qty: Number(form.qty), description: form.description, unitPrice: Number(form.unitPrice)||0 }],
    })
    setBusy(false)
  }

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices / Factures</h1>
          <p className={styles.sub}>Staples-style invoices for INDIMOE Cleaning</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ New Invoice'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className={styles.formHead}>
            <span className={styles.sectionTitle}>New Invoice / Nouvelle Facture</span>
          </div>

          {/* Mini invoice header preview */}
          <div className={styles.invoicePreview}>
            <div>
              <div className={styles.companyName}>{COMPANY.name}</div>
              <div className={styles.companyMeta}>{COMPANY.address}</div>
              <div className={styles.companyMeta}>Cell: {COMPANY.cell} &nbsp;·&nbsp; {COMPANY.email}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className={styles.invBigTitle}>INVOICE / FACTURE</div>
              <div className={styles.companyMeta}>No. <strong>{form.invoiceNumber}</strong></div>
              <div className={styles.companyMeta}>{form.date}</div>
              <div className={styles.companyMeta} style={{marginTop:4,color:'var(--text-3)',fontSize:11}}>Tax Reg. No.: {COMPANY.taxReg}</div>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="field">
              <label>Sold To / Vendu à *</label>
              <input placeholder="e.g. Swiss Chalet" value={form.clientName} onChange={e => setF('clientName', e.target.value)} />
            </div>
            <div className="field">
              <label>P.O. / Bon de commande</label>
              <input placeholder="Optional" value={form.poNumber} onChange={e => setF('poNumber', e.target.value)} />
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Client Address / Adresse</label>
              <input value={form.clientAddress} onChange={e => setF('clientAddress', e.target.value)} />
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Description of Services</label>
              <input value={form.description} onChange={e => setF('description', e.target.value)} />
            </div>
            <div className="field">
              <label>Qty / Qté</label>
              <input type="number" min="1" value={form.qty} onChange={e => setF('qty', e.target.value)} />
            </div>
            <div className="field">
              <label>Unit Price / Prix unitaire ($)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.unitPrice} onChange={e => setF('unitPrice', e.target.value)} />
            </div>
          </div>

          <div className={styles.totalsBlock}>
            <div className={styles.totalRow}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className={styles.totalRow}><span>GST / TPS (5%)</span><span>${gst.toFixed(2)}</span></div>
            <div className={styles.totalRow}><span>HST / TVH (Alberta — 0%)</span><span>$0.00</span></div>
            <div className={`${styles.totalRow} ${styles.totalFinal}`}><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
            {total > 0 && <div className={styles.amountWords}>{numberToWords(total)}</div>}
          </div>

          <div className={styles.formActions}>
            <button className="btn" onClick={previewPDF} disabled={busy}>
              {busy ? 'Generating…' : '⬇ Preview PDF'}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.clientName || !form.unitPrice}>
              {saving ? 'Saving…' : '💾 Save Invoice'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className={styles.formHead}>
          <span className={styles.sectionTitle}>Invoice History</span>
          <span style={{fontSize:12,color:'var(--text-3)'}}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
        </div>
        <table className={styles.table}>
          <thead>
            <tr><th>Invoice #</th><th>Date</th><th>Client</th><th>Services</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>No invoices yet — create your first one above.</td></tr>
            )}
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td className={styles.invNum}>{inv.invoice_number}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{new Date(inv.invoice_date).toLocaleDateString('en-CA')}</td>
                <td>
                  <div style={{fontWeight:500}}>{inv.client_name}</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>{inv.client_address}</div>
                </td>
                <td style={{fontSize:12,color:'var(--text-2)',maxWidth:160}}>{inv.description}</td>
                <td style={{fontWeight:600,color:'var(--teal-600)'}}>${Number(inv.total).toFixed(2)}</td>
                <td><button className="btn btn-sm" onClick={() => downloadPDF(inv)} disabled={busy}>⬇ PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
