'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import styles from './photos.module.css'

export default function PhotosPage() {
  const supabase = createClient()
  const fileRef  = useRef()

  const [profile, setProfile]                 = useState(null)
  const [store, setStore]                     = useState(null)
  const [photos, setPhotos]                   = useState([])
  const [photoType, setPhotoType]             = useState('before')
  const [uploading, setUploading]             = useState(false)
  const [caption, setCaption]                 = useState('')
  const [allStores, setAllStores]             = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [ready, setReady]                     = useState(false)
  const [lightbox, setLightbox]               = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
    setProfile(p); setStore(p?.store)

    if (p?.role === 'manager') {
      const { data: s } = await supabase.from('stores').select('*').order('name')
      setAllStores(s || [])
      if (s?.length) { setSelectedStoreId(s[0].id); loadPhotos(s[0].id) }
    } else {
      setSelectedStoreId(p?.store_id)
      loadPhotos(p?.store_id)
    }
    setReady(true)
  }

  async function loadPhotos(storeId) {
    if (!storeId) return
    const { data: jobs } = await supabase.from('jobs').select('id').eq('store_id', storeId)
    const jobIds = jobs?.map(j => j.id) || []

    let phQuery = supabase.from('photos')
      .select('*, uploader:profiles(full_name)')
      .order('created_at', { ascending: false })

    if (jobIds.length > 0) {
      phQuery = phQuery.in('job_id', jobIds)
    } else {
      phQuery = phQuery.eq('store_id', storeId)
    }

    const { data: ph } = await phQuery
    setPhotos(ph || [])
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${selectedStoreId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file)
    if (!upErr) {
      await supabase.from('photos').insert({
        uploaded_by: profile.id,
        store_id: selectedStoreId,
        storage_path: path,
        photo_type: photoType,
        caption: caption || null,
        job_id: null,
      })
      setCaption('')
      loadPhotos(selectedStoreId)
    }
    setUploading(false)
    fileRef.current.value = ''
  }

  async function handleDelete(ph) {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    await supabase.storage.from('job-photos').remove([ph.storage_path])
    await supabase.from('photos').delete().eq('id', ph.id)
    loadPhotos(selectedStoreId)
  }

  async function handleStoreChange(storeId) {
    setSelectedStoreId(storeId)
    setPhotos([])
    loadPhotos(storeId)
  }

  function getUrl(path) {
    return supabase.storage.from('job-photos').getPublicUrl(path).data.publicUrl
  }

  function openLightbox(ph) {
    setLightbox({
      url: getUrl(ph.storage_path),
      type: ph.photo_type,
      caption: ph.caption,
      by: ph.uploader?.full_name,
      time: new Date(ph.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }),
    })
  }

  const isManager = profile?.role === 'manager'
  const currentStore = allStores.find(s => s.id === selectedStoreId) || store

  const beforePhotos = photos.filter(p => p.photo_type === 'before')
  const afterPhotos  = photos.filter(p => p.photo_type === 'after')
  const otherPhotos  = photos.filter(p => p.photo_type === 'other')

  if (!ready) return null

  return (
    <Layout profile={profile} store={store}>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.url} alt={lightbox.type} className={styles.lightboxImg} />
            <div className={styles.lightboxMeta}>
              <span className={`badge badge-${lightbox.type === 'before' ? 'pending' : lightbox.type === 'after' ? 'done' : 'progress'}`}>
                {lightbox.type}
              </span>
              {lightbox.caption && <span className={styles.lightboxCaption}>{lightbox.caption}</span>}
              <span className={styles.lightboxBy}>{lightbox.by}</span>
              <span className={styles.lightboxTime}>{lightbox.time}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Photos</h1>
          <p className={styles.sub}>
            {isManager ? 'View photos from any store' : `📍 ${store?.name || 'Detecting store…'}`}
          </p>
        </div>
      </div>

      {isManager && (
        <div className={styles.storePicker}>
          {allStores.map(s => (
            <button
              key={s.id}
              className={`${styles.storeTab} ${selectedStoreId === s.id ? styles.storeTabActive : ''}`}
              onClick={() => handleStoreChange(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Upload card */}
      <div className="card">
        <div className={styles.uploadSection}>
          <div className={styles.uploadLabel}>Upload a photo</div>
          <div className={styles.uploadControls}>
            <select value={photoType} onChange={e => setPhotoType(e.target.value)} className={styles.typeSelect}>
              <option value="before">Before</option>
              <option value="after">After</option>
              <option value="other">Other</option>
            </select>
            <input
              placeholder="Caption (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className={styles.captionInput}
            />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className={styles.fileInput} />
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading || !selectedStoreId}>
              {uploading ? 'Uploading…' : '📷 Upload photo'}
            </button>
          </div>
        </div>
      </div>

      {/* Before / After columns */}
      <div className={styles.columns}>

        {/* BEFORE */}
        <div className={styles.column}>
          <div className={`${styles.columnHeader} ${styles.columnHeaderBefore}`}>
            <span className={styles.columnIcon}>🔴</span>
            <span className={styles.columnTitle}>Before</span>
            {beforePhotos.length > 0 && (
              <span className={styles.columnCount}>{beforePhotos.length}</span>
            )}
          </div>

          {beforePhotos.length === 0 ? (
            <div className={styles.columnEmpty}>
              <div className={styles.columnEmptyIcon}>📷</div>
              <div className={styles.columnEmptyText}>No before photos yet</div>
            </div>
          ) : (
            <div className={styles.photoList}>
              {beforePhotos.map(ph => (
                <PhotoCard key={ph.id} ph={ph} getUrl={getUrl} onClick={() => openLightbox(ph)} isManager={isManager} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* AFTER */}
        <div className={styles.column}>
          <div className={`${styles.columnHeader} ${styles.columnHeaderAfter}`}>
            <span className={styles.columnIcon}>🟢</span>
            <span className={styles.columnTitle}>After</span>
            {afterPhotos.length > 0 && (
              <span className={styles.columnCount}>{afterPhotos.length}</span>
            )}
          </div>

          {afterPhotos.length === 0 ? (
            <div className={styles.columnEmpty}>
              <div className={styles.columnEmptyIcon}>📷</div>
              <div className={styles.columnEmptyText}>No after photos yet</div>
            </div>
          ) : (
            <div className={styles.photoList}>
              {afterPhotos.map(ph => (
                <PhotoCard key={ph.id} ph={ph} getUrl={getUrl} onClick={() => openLightbox(ph)} isManager={isManager} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OTHER */}
      {otherPhotos.length > 0 && (
        <div className={styles.otherSection}>
          <div className={`${styles.columnHeader} ${styles.columnHeaderOther}`}>
            <span className={styles.columnIcon}>🔵</span>
            <span className={styles.columnTitle}>Other</span>
            <span className={styles.columnCount}>{otherPhotos.length}</span>
          </div>
          <div className={styles.otherGrid}>
            {otherPhotos.map(ph => (
              <PhotoCard key={ph.id} ph={ph} getUrl={getUrl} onClick={() => openLightbox(ph)} isManager={isManager} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

    </Layout>
  )
}

function PhotoCard({ ph, getUrl, onClick, isManager, onDelete }) {
  const url = getUrl(ph.storage_path)
  const date = new Date(ph.created_at)
  const dateStr = date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.photoCard} onClick={onClick}>
      <div className={styles.imgWrapper}>
        <img src={url} alt={ph.photo_type} className={styles.img} />
        {isManager && (
          <button
            className={styles.deleteBtn}
            onClick={e => { e.stopPropagation(); onDelete(ph) }}
            title="Delete photo"
          >
            🗑
          </button>
        )}
      </div>
      <div className={styles.photoMeta}>
        {ph.caption && <div className={styles.photoCaption}>{ph.caption}</div>}
        <div className={styles.photoRow}>
          <span className={styles.photoBy}>{ph.uploader?.full_name || 'Unknown'}</span>
          <span className={styles.photoTime}>{dateStr} · {timeStr}</span>
        </div>
      </div>
    </div>
  )
}
