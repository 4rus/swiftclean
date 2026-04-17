'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import styles from './checklist.module.css'

export default function ChecklistPage() {
  const supabase = createClient()
  const [profile, setProfile]           = useState(null)
  const [stores, setStores]             = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [templates, setTemplates]       = useState([])
  const [completions, setCompletions]   = useState([])
  const [newItem, setNewItem]           = useState('')
  const [adding, setAdding]             = useState(false)
  const [loading, setLoading]           = useState(true)

  const isManager = profile?.role === 'manager'

  function getShiftDate() {
    const now = new Date()
    // Before 7am counts as the previous shift day (covers overnight 10pm–7am shifts)
    if (now.getHours() < 7) {
      const prev = new Date(now)
      prev.setDate(prev.getDate() - 1)
      return prev.toISOString().split('T')[0]
    }
    return now.toISOString().split('T')[0]
  }

  const today = getShiftDate()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: p } = await supabase
      .from('profiles')
      .select('*, store:stores(*)')
      .eq('id', session.user.id)
      .single()

    setProfile(p)

    if (p?.role === 'manager') {
      const { data: storeList } = await supabase.from('stores').select('*').order('name')
      setStores(storeList || [])
      const defaultId = storeList?.[0]?.id
      setSelectedStoreId(defaultId)
      if (defaultId) await loadChecklist(defaultId)
    } else {
      setSelectedStoreId(p?.store_id)
      if (p?.store_id) await loadChecklist(p.store_id)
    }

    setLoading(false)
  }

  async function loadChecklist(storeId) {
    if (!storeId) return

    const { data: tmpl } = await supabase
      .from('daily_checklist_templates')
      .select('*')
      .eq('store_id', storeId)
      .order('position')

    setTemplates(tmpl || [])

    const ids = (tmpl || []).map(t => t.id)
    if (ids.length > 0) {
      const { data: comp } = await supabase
        .from('daily_checklist_completions')
        .select('*')
        .in('template_id', ids)
        .eq('date', today)
      setCompletions(comp || [])
    } else {
      setCompletions([])
    }
  }

  async function handleStoreChange(storeId) {
    setSelectedStoreId(storeId)
    setTemplates([])
    setCompletions([])
    await loadChecklist(storeId)
  }

  async function toggleItem(template) {
    const existing = completions.find(c => c.template_id === template.id)
    const newDone = existing ? !existing.is_done : true

    if (existing) {
      setCompletions(prev => prev.map(c =>
        c.id === existing.id ? { ...c, is_done: newDone } : c
      ))
      await supabase.from('daily_checklist_completions').update({
        is_done: newDone,
        done_by: newDone ? profile.id : null,
        done_at: newDone ? new Date().toISOString() : null,
      }).eq('id', existing.id)
    } else {
      const { data: inserted } = await supabase
        .from('daily_checklist_completions')
        .insert({
          template_id: template.id,
          store_id: selectedStoreId,
          date: today,
          is_done: true,
          done_by: profile.id,
          done_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (inserted) setCompletions(prev => [...prev, inserted])
    }
  }

  async function addItem() {
    if (!newItem.trim() || !selectedStoreId) return
    setAdding(true)
    const { data: inserted } = await supabase
      .from('daily_checklist_templates')
      .insert({
        store_id: selectedStoreId,
        item_label: newItem.trim(),
        position: templates.length,
        created_by: profile.id,
      })
      .select()
      .single()
    if (inserted) setTemplates(prev => [...prev, inserted])
    setNewItem('')
    setAdding(false)
  }

  async function deleteItem(templateId) {
    await supabase.from('daily_checklist_templates').delete().eq('id', templateId)
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    setCompletions(prev => prev.filter(c => c.template_id !== templateId))
  }

  const isDone = (id) => completions.find(c => c.template_id === id)?.is_done ?? false
  const doneCount = templates.filter(t => isDone(t.id)).length
  const pct = templates.length ? Math.round(doneCount / templates.length * 100) : 0
  const selectedStore = stores.find(s => s.id === selectedStoreId) || profile?.store
  const dateLabel = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return null

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Checklist</h1>
          <p className={styles.sub}>
            {isManager ? 'Write tasks for your staff — resets every day' : 'Check off your tasks for today'}
          </p>
        </div>
        {isManager && stores.length > 0 && (
          <select
            className={styles.storeSelect}
            value={selectedStoreId || ''}
            onChange={e => handleStoreChange(e.target.value)}
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card">
        <div className={styles.cardHead}>
          <div>
            <div className={styles.cardTitle}>{selectedStore?.name || 'Checklist'} — {dateLabel}</div>
            <div className={styles.cardSub}>Resets automatically every day</div>
          </div>
          {templates.length > 0 && (
            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.progressText}>{doneCount}/{templates.length}</span>
            </div>
          )}
        </div>

        {templates.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>☑</div>
            <div className={styles.emptyText}>
              {isManager ? 'No items yet — add some below' : 'No checklist items for today yet'}
            </div>
          </div>
        ) : (
          <div className={styles.itemList}>
            {templates.map(template => (
              <div
                key={template.id}
                className={`${styles.checkItem} ${isDone(template.id) ? styles.done : ''}`}
              >
                <div
                  className={`${styles.checkbox} ${isDone(template.id) ? styles.checked : ''}`}
                  onClick={() => toggleItem(template)}
                >
                  {isDone(template.id) && <span className={styles.checkmark}>✓</span>}
                </div>
                <span className={styles.itemLabel} onClick={() => toggleItem(template)}>
                  {template.item_label}
                </span>
                {isManager && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteItem(template.id)}
                    title="Remove item"
                  >×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {isManager && (
          <div className={styles.addSection}>
            <input
              className={styles.addInput}
              type="text"
              placeholder="Add a checklist item…"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
            />
            <button
              className="btn btn-primary"
              onClick={addItem}
              disabled={adding || !newItem.trim()}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
