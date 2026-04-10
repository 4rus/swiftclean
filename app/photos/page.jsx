'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import Layout from '../../components/Layout'
import styles from './photos.module.css'

export default function PhotosPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [store, setStore]     = useState(null)
  const [jobs, setJobs]       = useState([])
  const [photos, setPhotos]   = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [photoType, setPhotoType]     = useState('before')
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
if (!user) return
    const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
    setProfile(p); setStore(p?.store)
    const { data: j } = await supabase.from('jobs').select('id,client_name,location_detail').eq('store_id', p?.store_id).order('created_at',{ascending:false})
    setJobs(j||[])
    loadPhotos(p?.store_id)
  }

  async function loadPhotos(storeId) {
    const { data: j } = await supabase.from('jobs').select('id').eq('store_id', storeId)
    if (!j?.length) return
    const ids = j.map(x=>x.id)
    const { data: ph } = await supabase.from('photos').select('*, job:jobs(client_name), uploader:profiles(full_name)').in('job_id', ids).order('created_at',{ascending:false})
    setPhotos(ph||[])
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedJob) return
    setUploading(true)
    const path = `${profile.store_id}/${selectedJob}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file)
    if (!upErr) {
      await supabase.from('photos').insert({ job_id: selectedJob, uploaded_by: profile.id, storage_path: path, photo_type: photoType })
      loadPhotos(profile.store_id)
    }
    setUploading(false)
    fileRef.current.value = ''
  }

  function getUrl(path) {
    return supabase.storage.from('job-photos').getPublicUrl(path).data.publicUrl
  }

  return (
    <Layout profile={profile} store={store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Photos</h1><p className={styles.sub}>Before &amp; after photos per job</p></div>
      </div>
      <div className="card">
        <div className={styles.uploadBar}>
          <select value={selectedJob} onChange={e=>setSelectedJob(e.target.value)} style={{flex:1}}>
            <option value="">Select a job…</option>
            {jobs.map(j=><option key={j.id} value={j.id}>{j.client_name} — {j.location_detail||'No detail'}</option>)}
          </select>
          <select value={photoType} onChange={e=>setPhotoType(e.target.value)}>
            <option value="before">Before</option>
            <option value="after">After</option>
            <option value="other">Other</option>
          </select>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={!selectedJob||uploading} className={styles.fileInput} />
          <button className="btn btn-primary" onClick={()=>fileRef.current?.click()} disabled={!selectedJob||uploading}>
            {uploading?'Uploading…':'📷 Upload photo'}
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        {photos.length===0&&<p style={{color:'var(--text-3)',fontSize:13}}>No photos uploaded yet.</p>}
        {photos.map(ph=>(
          <div key={ph.id} className={styles.photoCard}>
            <img src={getUrl(ph.storage_path)} alt={ph.photo_type} className={styles.img} />
            <div className={styles.photoMeta}>
              <span className={`badge badge-${ph.photo_type==='before'?'pending':ph.photo_type==='after'?'done':'progress'}`}>{ph.photo_type}</span>
              <span className={styles.photoJob}>{ph.job?.client_name}</span>
              <span className={styles.photoBy}>{ph.uploader?.full_name}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
