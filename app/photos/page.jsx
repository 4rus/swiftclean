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
  const [lightbox, setLightbox]               = useState(null) // NEW

  useEffect(() => { loadData() }, [])

  // Close lightbox on Escape key
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

  async function handleStoreChange(storeId) {
    setSelectedStoreId(storeId)
    setPhotos([])
    loadPhotos(storeId)
  }

  function getUrl(path) {
    return supabase.storage.from('job-photos').getPublicUrl(path).data.publicUrl
  }

  const isManager = profile?.role === 'manager'
  const currentStore = allStores.find(s => s.id === selectedStoreId) || store

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

      <div className="card">
        <div className={styles.uploadSection}>
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

      {photos.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{fontSize:36}}>📷</div>
          <div style={{fontSize:13, color:'var(--text-3)', marginTop:8}}>
            No photos yet for {currentStore?.name}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {photos.map(ph => {
            const url = getUrl(ph.storage_path)
            return (
              <div
                key={ph.id}
                className={styles.photoCard}
                onClick={() => setLightbox({
                  url,
                  type: ph.photo_type,
                  caption: ph.caption,
                  by: ph.uploader?.full_name,
                  time: new Date(ph.created_at).toLocaleDateString('en-CA')
                })}
              >
                <img src={url} alt={ph.photo_type} className={styles.img} />
                <div className={styles.photoMeta}>
                  <span className={`badge badge-${ph.photo_type === 'before' ? 'pending' : ph.photo_type === 'after' ? 'done' : 'progress'}`}>
                    {ph.photo_type}
                  </span>
                  {ph.caption && <div className={styles.photoCaption}>{ph.caption}</div>}
                  <div className={styles.photoBy}>{ph.uploader?.full_name}</div>
                  <div className={styles.photoTime}>{new Date(ph.created_at).toLocaleDateString('en-CA')}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}