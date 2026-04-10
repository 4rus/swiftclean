'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Layout from '../../../components/Layout'
import styles from './new-job.module.css'

export default function NewJobPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [store, setStore]     = useState(null)
  const [employees, setEmployees] = useState([])
  const [form, setForm]       = useState({ client_name: '', location_detail: '', scheduled_time: '', assigned_to: '', notes: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { loadData() }, [])
  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
    setProfile(p); setStore(p?.store)
    const { data: emp } = await supabase.from('profiles').select('id, full_name').eq('store_id', p?.store_id)
    setEmployees(emp || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const { error: err } = await supabase.from('jobs').insert({
      store_id: profile?.store_id,
      client_name: form.client_name,
      location_detail: form.location_detail,
      scheduled_time: form.scheduled_time || null,
      assigned_to: form.assigned_to || null,
      notes: form.notes,
      status: 'pending',
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/jobs')
  }

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>New job</h1><p className={styles.sub}>Schedule a cleaning job for {store?.name}</p></div>
      </div>
      <div className={`card ${styles.formCard}`}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className="field"><label>Client name *</label><input value={form.client_name} onChange={e=>setForm(f=>({...f,client_name:e.target.value}))} required placeholder="e.g. Swiss Chalet" /></div>
          <div className="field"><label>Location detail</label><input value={form.location_detail} onChange={e=>setForm(f=>({...f,location_detail:e.target.value}))} placeholder="e.g. Kitchen & dining area" /></div>
          <div className="field"><label>Scheduled time</label><input type="datetime-local" value={form.scheduled_time} onChange={e=>setForm(f=>({...f,scheduled_time:e.target.value}))} /></div>
          <div className="field">
            <label>Assign to employee</label>
            <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))}>
              <option value="">Unassigned</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Any special instructions…" style={{resize:'vertical'}} /></div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create job'}</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
