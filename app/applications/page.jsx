'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import styles from './applications.module.css'

const STATUS_OPTIONS = ['new','reviewed','interviewing','hired','rejected']

function statusBadge(s) {
  const map = {
    new:          { label: 'New',          cls: styles.sNew },
    reviewed:     { label: 'Reviewed',     cls: styles.sReviewed },
    interviewing: { label: 'Interviewing', cls: styles.sInterview },
    hired:        { label: 'Hired',        cls: styles.sHired },
    rejected:     { label: 'Rejected',     cls: styles.sRejected },
  }
  return map[s] || { label: s, cls: '' }
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

export default function ApplicationsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile, setProfile]   = useState(null)
  const [store, setStore]       = useState(null)
  const [apps, setApps]         = useState([])
  const [filter, setFilter]     = useState('all')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()
    if (p?.role !== 'manager') { router.push('/dashboard'); return }
    setProfile(p); setStore(p?.store)

    const { data } = await supabase.from('job_applications').select('*').order('created_at', { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('job_applications').update({ status }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    if (selected?.id === id) setSelected(a => ({ ...a, status }))
  }

  async function getResumeUrl(path) {
    const { data } = await supabase.storage.from('job-applications').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)
  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: apps.filter(a => a.status === s).length }), {})

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Job Applications</h1>
          <p className={styles.sub}>{apps.length} total · {counts.new || 0} new</p>
        </div>
        <a
          href={typeof window !== 'undefined' ? `${window.location.origin}/careers` : '/careers'}
          target="_blank"
          className="btn"
        >
          🔗 Share application link ↗
        </a>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterBar}>
        {[['all', 'All', apps.length], ...STATUS_OPTIONS.map(s => [s, statusBadge(s).label, counts[s] || 0])].map(([val, label, count]) => (
          <button
            key={val}
            className={`${styles.filterBtn} ${filter === val ? styles.filterActive : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
            <span className={styles.filterCount}>{count}</span>
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        {/* List */}
        <div className={styles.list}>
          {loading && <div className={styles.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>No applications {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</div>
          )}
          {filtered.map(app => {
            const { label, cls } = statusBadge(app.status)
            return (
              <div
                key={app.id}
                className={`${styles.appCard} ${selected?.id === app.id ? styles.appCardSelected : ''}`}
                onClick={() => setSelected(app)}
              >
                <div className={styles.appAvatar}>{initials(app.full_name)}</div>
                <div className={styles.appInfo}>
                  <div className={styles.appName}>{app.full_name}</div>
                  <div className={styles.appMeta}>{app.email} · {app.phone}</div>
                  <div className={styles.appMeta2}>
                  {app.canada_status ? `🇨🇦 ${app.canada_status} · ` : ''}
                  {app.available_days?.slice(0,3).join(', ')}{app.available_days?.length > 3 ? '…' : ''}
                  {app.has_drivers_licence ? ' · 🚗 Licence' : ''}
                  {app.resume_path ? ' · 📄 Resume' : ''}
                </div>
                </div>
                <div className={styles.appRight}>
                  <span className={`${styles.statusPill} ${cls}`}>{label}</span>
                  <div className={styles.appDate}>{new Date(app.created_at).toLocaleDateString('en-CA')}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className={`${styles.detail} ${selected ? styles.detailOpen : ''}`}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <div style={{fontSize:32}}>👤</div>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:8}}>Select an application to view details</div>
            </div>
          ) : (
            <div className={styles.detailInner}>
              {/* Applicant header */}
              <div className={styles.detailHead}>
                <div className={styles.detailAvatar}>{initials(selected.full_name)}</div>
                <div>
                  <div className={styles.detailName}>{selected.full_name}</div>
                  <div className={styles.detailContact}>{selected.email}</div>
                  <div className={styles.detailContact}>{selected.phone}{selected.city ? ` · ${selected.city}` : ''}</div>
                </div>
              </div>

              {/* Status changer */}
              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Update status</div>
                <div className={styles.statusBtns}>
                  {STATUS_OPTIONS.map(s => {
                    const { label, cls } = statusBadge(s)
                    return (
                      <button
                        key={s}
                        className={`${styles.statusBtn} ${selected.status === s ? styles.statusBtnActive : ''} ${cls}`}
                        onClick={() => updateStatus(selected.id, s)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Availability */}
              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Availability</div>
                <div className={styles.dayChips}>
                  {(selected.available_days || []).map(d => <span key={d} className={styles.dayChip}>{d}</span>)}
                  {(!selected.available_days || selected.available_days.length === 0) && <span style={{color:'var(--text-3)',fontSize:13}}>Not specified</span>}
                </div>
                {selected.available_hours && <div className={styles.detailText}>⏰ {selected.available_hours}</div>}
                {selected.start_date && <div className={styles.detailText}>📅 Can start: {new Date(selected.start_date).toLocaleDateString('en-CA')}</div>}
              </div>

              {/* Work experience */}
              {selected.work_experience && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Work experience</div>
                  <div className={styles.detailBlock}>{selected.work_experience}</div>
                </div>
              )}

              {/* Driver's licence + SIN */}
              <div className={styles.detailSection}>
  <div className={styles.detailLabel}>Details</div>
  {selected.canada_status && <div className={styles.detailText}>🇨🇦 Status in Canada: <strong>{selected.canada_status}</strong></div>}
  <div className={styles.detailText}>🚗 Driver's licence: <strong>{selected.has_drivers_licence ? 'Yes' : 'No'}</strong></div>
  {selected.sin_number && <div className={styles.detailText}>🔒 SIN: <strong>{selected.sin_number}</strong></div>}
</div>

              {/* Emergency contact */}
              {selected.emergency_name && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Emergency contact</div>
                  <div className={styles.detailText}>{selected.emergency_name} ({selected.emergency_relation})</div>
                  <div className={styles.detailText}>📞 {selected.emergency_phone}</div>
                </div>
              )}

              {/* References */}
              {(selected.ref1_name || selected.ref2_name) && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>References</div>
                  {selected.ref1_name && (
                    <div className={styles.refRow}>
                      <div className={styles.detailText}><strong>{selected.ref1_name}</strong> — {selected.ref1_relation}</div>
                      <div className={styles.detailText}>📞 {selected.ref1_phone}</div>
                    </div>
                  )}
                  {selected.ref2_name && (
                    <div className={styles.refRow} style={{marginTop:8}}>
                      <div className={styles.detailText}><strong>{selected.ref2_name}</strong> — {selected.ref2_relation}</div>
                      <div className={styles.detailText}>📞 {selected.ref2_phone}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Cover note */}
              {selected.cover_note && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Cover note</div>
                  <div className={styles.detailBlock}>{selected.cover_note}</div>
                </div>
              )}

              {/* Resume */}
              {selected.resume_path && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Resume</div>
                  <button className="btn" onClick={() => getResumeUrl(selected.resume_path)}>
                    📄 Download resume ↗
                  </button>
                </div>
              )}

              <div style={{height:24}} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
