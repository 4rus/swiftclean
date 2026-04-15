'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import styles from './checklist.module.css'

const DEFAULT_ITEMS = [
  'Sweep / vacuum all floors',
  'Mop hard floors',
  'Wipe all surfaces and countertops',
  'Clean and disinfect bathrooms',
  'Empty all bins and replace liners',
  'Clean windows and mirrors',
  'Restock supplies if needed',
  'Take before & after photos',
  'Final walkthrough',
]

export default function ChecklistPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [store, setStore]     = useState(null)
  const [jobs, setJobs]       = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [items, setItems]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()
    setProfile(p); setStore(p?.store)
    const { data: j } = await supabase.from('jobs')
      .select('id,client_name,location_detail,status')
      .eq('store_id', p?.store_id)
      .neq('status','done')
      .order('scheduled_time', { ascending: true })
    setJobs(j || [])
  }

  async function selectJob(job) {
    setSelectedJob(job)
    const { data: existing } = await supabase.from('job_checklist')
      .select('*').eq('job_id', job.id).order('position')
    if (existing && existing.length > 0) {
      setItems(existing)
    } else {
      // seed default items
      const seeded = DEFAULT_ITEMS.map((label, i) => ({
        job_id: job.id, item_label: label, is_done: false, position: i
      }))
      const { data: inserted } = await supabase.from('job_checklist').insert(seeded).select()
      setItems(inserted || seeded)
    }
  }

  async function toggleItem(item) {
    const newDone = !item.is_done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: newDone } : i))
    if (item.id) {
      await supabase.from('job_checklist').update({
        is_done: newDone,
        done_by: newDone ? profile?.id : null,
        done_at: newDone ? new Date().toISOString() : null,
      }).eq('id', item.id)
    }
  }

  async function markJobDone() {
    if (!selectedJob) return
    setMarking(true)
    await supabase.from('jobs').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', selectedJob.id)
    setJobs(prev => prev.filter(j => j.id !== selectedJob.id))
    setSelectedJob(null)
    setItems([])
    setMarking(false)
  }

  const doneCount = items.filter(i => i.is_done).length
  const pct = items.length ? Math.round(doneCount / items.length * 100) : 0

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Checklist</h1><p className={styles.sub}>Mark off tasks as you clean each area</p></div>
      </div>

      <div className={styles.twoCol}>
        {/* Job selector */}
        <div className="card">
          <div className={styles.cardHead}><span className={styles.cardTitle}>Active jobs</span></div>
          {jobs.length === 0 && <p className={styles.empty}>No active jobs — all done! 🎉</p>}
          {jobs.map(j => (
            <div
              key={j.id}
              className={`${styles.jobItem} ${selectedJob?.id === j.id ? styles.selected : ''}`}
              onClick={() => selectJob(j)}
            >
              <div className={styles.jobName}>{j.client_name}</div>
              <div className={styles.jobLoc}>{j.location_detail || 'No location detail'}</div>
              <span className={`badge badge-${j.status === 'in_progress' ? 'progress' : 'pending'}`}>
                {j.status === 'in_progress' ? 'In progress' : 'Pending'}
              </span>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="card">
          {!selectedJob ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>☑</div>
              <div className={styles.emptyText}>Select a job to view its checklist</div>
            </div>
          ) : (
            <>
              <div className={styles.cardHead}>
                <div>
                  <div className={styles.cardTitle}>{selectedJob.client_name}</div>
                  <div className={styles.cardSub}>{selectedJob.location_detail}</div>
                </div>
                <div className={styles.progress}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.progressText}>{doneCount}/{items.length}</span>
                </div>
              </div>

              <div className={styles.itemList}>
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`${styles.checkItem} ${item.is_done ? styles.done : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className={`${styles.checkbox} ${item.is_done ? styles.checked : ''}`}>
                      {item.is_done && <span className={styles.checkmark}>✓</span>}
                    </div>
                    <span className={styles.itemLabel}>{item.item_label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.cardFooter}>
                <button
                  className="btn btn-primary"
                  onClick={markJobDone}
                  disabled={marking || pct < 100}
                  title={pct < 100 ? 'Complete all items first' : ''}
                >
                  {marking ? 'Marking…' : pct === 100 ? '✅ Mark job complete' : `Complete all items first (${pct}%)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
