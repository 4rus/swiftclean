'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Layout from '../../../components/Layout'
import styles from './invite.module.css'

export default function InvitePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [store, setStore]     = useState(null)
  const [stores, setStores]   = useState([])
  const [form, setForm]       = useState({ email: '', full_name: '', role: 'employee', store_id: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { loadData() }, [])
  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()
    setProfile(p); setStore(p?.store)
    const { data: s } = await supabase.from('stores').select('*')
    setStores(s || [])
    setForm(f => ({ ...f, store_id: p?.store_id || '' }))
  }

  async function handleInvite(e) {
    e.preventDefault()
    setLoading(true); setError('')
    // Use Supabase admin invite (requires service role in prod; here we use signUp for demo)
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: Math.random().toString(36).slice(2) + 'A1!',
      options: { data: { full_name: form.full_name } }
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').update({ role: form.role, store_id: form.store_id, full_name: form.full_name }).eq('id', data.user.id)
    }
    setSuccess(true); setLoading(false)
  }

  if (success) return (
    <Layout profile={profile} store={store}>
      <div className={styles.successBox}>
        <div className={styles.successIcon}>✅</div>
        <h2>Invite sent!</h2>
        <p>{form.full_name} ({form.email}) has been invited. They will receive an email to set their password.</p>
        <button className="btn btn-primary" onClick={() => router.push('/employees')}>Back to employees</button>
      </div>
    </Layout>
  )

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Invite employee</h1><p className={styles.sub}>Add a new staff member to CleanTrack</p></div>
      </div>
      <div className={`card ${styles.formCard}`}>
        <form onSubmit={handleInvite} className={styles.form}>
          <div className="field"><label>Full name *</label><input value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} required placeholder="Jane Doe" /></div>
          <div className="field"><label>Email address *</label><input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required placeholder="jane@example.com" /></div>
          <div className="field">
            <label>Assign to store *</label>
            <select value={form.store_id} onChange={e => setForm(f=>({...f,store_id:e.target.value}))} required>
              <option value="">Select store…</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Inviting…' : 'Send invite'}</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
