'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import styles from './careers.module.css'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const CANADA_STATUSES = [
  { value: 'citizen',           label: 'Canadian Citizen' },
  { value: 'permanent_resident',label: 'Permanent Resident (PR)' },
  { value: 'open_work_permit',  label: 'Open Work Permit' },
  { value: 'employer_specific', label: 'Employer-Specific Work Permit' },
  { value: 'student_with_work', label: 'Study Permit (with work authorization)' },
  { value: 'pgwp',              label: 'Post-Graduation Work Permit (PGWP)' },
  { value: 'spousal_owp',       label: 'Spousal/Common-Law Open Work Permit' },
  { value: 'bridging_permit',   label: 'Bridging Open Work Permit (BOWP)' },
  { value: 'refugee_claimant',  label: 'Refugee Claimant / Protected Person' },
  { value: 'temporary_resident',label: 'Temporary Resident Permit (TRP)' },
  { value: 'international_mobility', label: 'International Mobility Program (IMP)' },
  { value: 'other',             label: 'Other / Not listed' },
]

export default function CareersPage() {
  const supabase = createClient()

  const [step, setStep]       = useState(1) // 1 = form, 2 = success
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [photoFiles, setPhotoFiles] = useState([])
  const [idPhotoFile, setIdPhotoFile] = useState(null)

  const [form, setForm] = useState({
    // Personal
    full_name: '', email: '', phone: '', city: '',
    // Availability
    available_days: [],
    available_hours: '',
    start_date: '',
    // Work experience
    work_experience: '',
    // Driver's licence
    has_drivers_licence: '',
    // SIN
    sin_number: '',
    // Status in Canada
    canada_status: '',
    canada_status_expiry: '',
    canada_status_other: '',
    // Emergency contact
    emergency_name: '', emergency_phone: '', emergency_relation: '',
    // References
    ref1_name: '', ref1_phone: '', ref1_relation: '',
    ref2_name: '', ref2_phone: '', ref2_relation: '',
    // Extra
    cover_note: '',
  })

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter(d => d !== day)
        : [...f.available_days, day]
    }))
  }

  // NEW — handle photo file selection (up to 5 photos)
  function handlePhotoChange(e) {
    const selected = Array.from(e.target.files || [])
    setPhotoFiles(prev => {
      const combined = [...prev, ...selected]
      return combined.slice(0, 5) // cap at 5
    })
  }

  function removePhoto(index) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.phone) {
      setError('Please fill in your name, email, and phone number.')
      return
    }
    if (form.sin_number && !/^\d{3}-\d{3}-\d{3}$/.test(form.sin_number) && !/^\d{9}$/.test(form.sin_number)) {
      setError('SIN number should be 9 digits (e.g. 123-456-789).')
      return
    }
    setSaving(true); setError('')

    let resume_path = null

    // Upload resume if provided
    if (resumeFile) {
      const ext = resumeFile.name.split('.').pop()
      const path = `resumes/${Date.now()}_${form.full_name.replace(/\s+/g,'_')}.${ext}`
      const { error: upErr } = await supabase.storage.from('job-applications').upload(path, resumeFile)
      if (upErr) { setError('Resume upload failed: ' + upErr.message); setSaving(false); return }
      resume_path = path
    }

    // Upload ID / licence photo
    let id_photo_path = null
    if (idPhotoFile) {
      const ext = idPhotoFile.name.split('.').pop()
      const path = `id-photos/${Date.now()}_${form.full_name.replace(/\s+/g,'_')}.${ext}`
      const { error: idErr } = await supabase.storage.from('job-applications').upload(path, idPhotoFile)
      if (idErr) { setError('ID photo upload failed: ' + idErr.message); setSaving(false); return }
      id_photo_path = path
    }

    // Upload status document photos
    const photo_paths = []
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i]
      const ext  = file.name.split('.').pop()
      const path = `photos/${Date.now()}_${i}_${form.full_name.replace(/\s+/g,'_')}.${ext}`
      const { error: phErr } = await supabase.storage.from('job-applications').upload(path, file)
      if (phErr) { setError('Photo upload failed: ' + phErr.message); setSaving(false); return }
      photo_paths.push(path)
    }

    const { error: dbErr } = await supabase.from('job_applications').insert({
      full_name:             form.full_name,
      email:                 form.email,
      phone:                 form.phone,
      city:                  form.city,
      available_days:        form.available_days,
      available_hours:       form.available_hours,
      start_date:            form.start_date || null,
      work_experience:       form.work_experience,
      has_drivers_licence:   form.has_drivers_licence === 'yes',
      sin_number:            form.sin_number,
      canada_status:         form.canada_status,
      canada_status_expiry:  form.canada_status_expiry || null,
      canada_status_other:   form.canada_status_other || null,
      id_photo_path,
      emergency_name:        form.emergency_name,
      emergency_phone:       form.emergency_phone,
      emergency_relation:    form.emergency_relation,
      ref1_name:             form.ref1_name,
      ref1_phone:            form.ref1_phone,
      ref1_relation:         form.ref1_relation,
      ref2_name:             form.ref2_name,
      ref2_phone:            form.ref2_phone,
      ref2_relation:         form.ref2_relation,
      cover_note:            form.cover_note,
      resume_path,
      photo_paths,           // NEW
      status:                'new',
    })

    if (dbErr) { setError('Submission failed: ' + dbErr.message); setSaving(false); return }
    setStep(2)
    setSaving(false)
  }

  if (step === 2) return (
    <div className={styles.wrap}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✅</div>
        <h2 className={styles.successTitle}>Application submitted!</h2>
        <p className={styles.successText}>
          Thank you, <strong>{form.full_name}</strong>! Your application has been received by INDIMOE Cleaning.
          We'll be in touch at <strong>{form.email}</strong> if you're a good fit.
        </p>
        <p className={styles.successSub}>No account needed — we have everything we need.</p>
      </div>
    </div>
  )

  // Statuses that have an expiry date (i.e. not citizens)
  const showExpiry = form.canada_status && form.canada_status !== 'citizen'

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLogo}>✦</div>
        <h1 className={styles.heroTitle}>Join INDIMOE Cleaning</h1>
        <p className={styles.heroSub}>
          We're hiring cleaners for our locations across Calgary, AB.
          Fill out the form below and we'll be in touch!
        </p>
        <div className={styles.heroBadges}>
          <span className={styles.heroBadge}>📍 Calgary, AB</span>
          <span className={styles.heroBadge}>🕐 Flexible hours</span>
          <span className={styles.heroBadge}>💼 Multiple locations</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>

        {/* Section 1 — Personal info */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>1</span>
            <div>
              <div className={styles.sectionTitle}>Personal Information</div>
              <div className={styles.sectionSub}>Your basic contact details</div>
            </div>
          </div>
          <div className={styles.grid2}>
            <div className="field"><label>Full name *</label><input value={form.full_name} onChange={e=>setF('full_name',e.target.value)} placeholder="Jane Doe" required /></div>
            <div className="field"><label>Email address *</label><input type="email" value={form.email} onChange={e=>setF('email',e.target.value)} placeholder="jane@example.com" required /></div>
            <div className="field"><label>Phone number *</label><input type="tel" value={form.phone} onChange={e=>setF('phone',e.target.value)} placeholder="403-555-0100" required /></div>
            <div className="field"><label>City / Area</label><input value={form.city} onChange={e=>setF('city',e.target.value)} placeholder="e.g. NE Calgary" /></div>
          </div>
        </div>

        {/* Section 2 — Availability */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>2</span>
            <div>
              <div className={styles.sectionTitle}>Availability</div>
              <div className={styles.sectionSub}>When can you work?</div>
            </div>
          </div>
          <div className="field" style={{marginBottom:14}}>
            <label>Available days</label>
            <div className={styles.dayGrid}>
              {DAYS.map(day => (
                <button
                  key={day} type="button"
                  className={`${styles.dayBtn} ${form.available_days.includes(day) ? styles.daySelected : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.grid2}>
            <div className="field">
              <label>Preferred hours</label>
              <select value={form.available_hours} onChange={e=>setF('available_hours',e.target.value)}>
                <option value="">Select…</option>
                <option>Morning (10:00 PM – 6:00 AM)</option>
              </select>
            </div>
            <div className="field">
              <label>Earliest start date</label>
              <input type="date" value={form.start_date} onChange={e=>setF('start_date',e.target.value)} />
            </div>
          </div>
        </div>

        {/* Section 3 — Work experience */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>3</span>
            <div>
              <div className={styles.sectionTitle}>Work Experience</div>
              <div className={styles.sectionSub}>Previous cleaning or related jobs</div>
            </div>
          </div>
          <div className="field">
            <label>Describe your experience</label>
            <textarea
              value={form.work_experience}
              onChange={e=>setF('work_experience',e.target.value)}
              rows={4}
              placeholder="e.g. 2 years cleaning at ABC Hotel, residential cleaning for 1 year, no prior experience but willing to learn…"
              style={{resize:'vertical', width:'100%'}}
            />
          </div>
        </div>

        {/* Section 4 — Driver's licence */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>4</span>
            <div>
              <div className={styles.sectionTitle}>Driver's Licence</div>
              <div className={styles.sectionSub}>Do you have a valid Canadian driver's licence?</div>
            </div>
          </div>
          <div className={styles.radioGroup}>
            {[['yes','Yes, I have a valid driver\'s licence'],['no','No, I don\'t have a driver\'s licence']].map(([val, label]) => (
              <label key={val} className={`${styles.radioCard} ${form.has_drivers_licence===val?styles.radioSelected:''}`}>
                <input type="radio" name="licence" value={val} checked={form.has_drivers_licence===val} onChange={()=>setF('has_drivers_licence',val)} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {form.has_drivers_licence !== '' && (
            <div className={styles.idUploadBlock}>
              <div className={styles.idUploadTitle}>
                {form.has_drivers_licence === 'yes' ? "Upload a photo of your driver's licence" : "Upload a photo of a Canadian government ID"}
              </div>
              <label className={styles.idUploadArea}>
                <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                  onChange={e => setIdPhotoFile(e.target.files?.[0] || null)} />
                {idPhotoFile ? (
                  <img src={URL.createObjectURL(idPhotoFile)} alt="ID preview" className={styles.idPreview} />
                ) : (
                  <div className={styles.idUploadPrompt}>
                    <span style={{fontSize:30}}>📷</span>
                    <span style={{fontSize:13,fontWeight:500}}>Tap to take a photo or upload</span>
                    <span style={{fontSize:11,color:'var(--text-3)'}}>JPG, PNG or HEIC</span>
                  </div>
                )}
              </label>
              {idPhotoFile && (
                <button type="button" className={styles.idRemoveBtn} onClick={() => setIdPhotoFile(null)}>
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 5 — SIN */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>5</span>
            <div>
              <div className={styles.sectionTitle}>Social Insurance Number (SIN)</div>
              <div className={styles.sectionSub}>Required for payroll. Kept strictly confidential.</div>
            </div>
          </div>
          <div className="field" style={{maxWidth:260}}>
            <label>SIN number</label>
            <input
              value={form.sin_number}
              onChange={e=>setF('sin_number',e.target.value)}
              placeholder="123-456-789"
              maxLength={11}
            />
          </div>
          <p className={styles.privacyNote}>🔒 Your SIN is stored securely and only visible to the hiring manager.</p>
        </div>

        {/* ── Section 6 — Status in Canada (NEW) ── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>6</span>
            <div>
              <div className={styles.sectionTitle}>Status in Canada</div>
              <div className={styles.sectionSub}>Select your current immigration / work authorization status</div>
            </div>
          </div>

          <div className={styles.statusGrid}>
            {CANADA_STATUSES.map(({ value, label }) => (
              <label
                key={value}
                className={`${styles.statusCard} ${form.canada_status === value ? styles.statusSelected : ''}`}
              >
                <input
                  type="radio"
                  name="canada_status"
                  value={value}
                  checked={form.canada_status === value}
                  onChange={() => setF('canada_status', value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {form.canada_status === 'other' && (
            <div className="field">
              <label>Please specify your status</label>
              <textarea
                value={form.canada_status_other}
                onChange={e => setF('canada_status_other', e.target.value)}
                rows={2}
                placeholder="Describe your immigration or work authorization status…"
                style={{resize:'vertical', width:'100%'}}
              />
            </div>
          )}

          {showExpiry && (
            <div className="field" style={{maxWidth: 260, marginTop: 4}}>
              <label>Permit / status expiry date <span className={styles.optionalTag}>(optional)</span></label>
              <input
                type="date"
                value={form.canada_status_expiry}
                onChange={e => setF('canada_status_expiry', e.target.value)}
              />
            </div>
          )}

          {/* ── Status document photos — inline under Canada status ── */}
          <div className={styles.statusPhotoBlock}>
            <div className={styles.statusPhotoLabel}>
              📎 Upload a photo of your status document
              <span className={styles.optionalTag}>(Up to 5 images)</span>
            </div>

            {/* Two big tap buttons: Camera or Upload */}
            {photoFiles.length < 5 && (
              <div className={styles.photoBtnRow}>
                {/* Take photo with camera */}
                <label className={styles.photoActionBtn}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{display:'none'}}
                    onChange={handlePhotoChange}
                  />
                  <span className={styles.photoActionIcon}>📷</span>
                  <span className={styles.photoActionText}>Take photo</span>
                  <span className={styles.photoActionSub}>Use camera</span>
                </label>

                {/* Upload from gallery / files */}
                <label className={styles.photoActionBtn}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
                    multiple
                    style={{display:'none'}}
                    onChange={handlePhotoChange}
                  />
                  <span className={styles.photoActionIcon}>🖼️</span>
                  <span className={styles.photoActionText}>Upload file</span>
                  <span className={styles.photoActionSub}>Gallery or files</span>
                </label>
              </div>
            )}

            {/* Thumbnails */}
            {photoFiles.length > 0 && (
              <div className={styles.photoGrid}>
                {photoFiles.map((file, i) => {
                  const url = URL.createObjectURL(file)
                  return (
                    <div key={i} className={styles.photoThumb}>
                      <img src={url} alt={`Photo ${i + 1}`} className={styles.photoImg} />
                      <button
                        type="button"
                        className={styles.photoRemove}
                        onClick={() => removePhoto(i)}
                        aria-label="Remove photo"
                      >✕</button>
                      <div className={styles.photoLabel}>{file.name.length > 18 ? file.name.slice(0,15)+'…' : file.name}</div>
                    </div>
                  )
                })}
                {photoFiles.length < 5 && (
                  <label className={styles.photoAddMore}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
                      multiple
                      style={{display:'none'}}
                      onChange={handlePhotoChange}
                    />
                    <span className={styles.photoAddIcon}>＋</span>
                    <span className={styles.photoAddText}>Add more</span>
                  </label>
                )}
              </div>
            )}
          </div>

          <p className={styles.privacyNote}>🔒 This information and any photos are kept confidential and used only for employment eligibility purposes.</p>
        </div>

        {/* Section 7 — Emergency contact (renumbered) */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>7</span>
            <div>
              <div className={styles.sectionTitle}>Emergency Contact</div>
              <div className={styles.sectionSub}>Someone we can reach in an emergency</div>
            </div>
          </div>
          <div className={styles.grid3}>
            <div className="field"><label>Full name</label><input value={form.emergency_name} onChange={e=>setF('emergency_name',e.target.value)} placeholder="John Doe" /></div>
            <div className="field"><label>Phone number</label><input type="tel" value={form.emergency_phone} onChange={e=>setF('emergency_phone',e.target.value)} placeholder="403-555-0100" /></div>
            <div className="field"><label>Relationship</label><input value={form.emergency_relation} onChange={e=>setF('emergency_relation',e.target.value)} placeholder="e.g. Spouse, Parent" /></div>
          </div>
        </div>

        {/* Section 8 — References (renumbered) */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>8</span>
            <div>
              <div className={styles.sectionTitle}>References</div>
              <div className={styles.sectionSub}>Two people who can vouch for you (not family)</div>
            </div>
          </div>
          <div className={styles.refBlock}>
            <div className={styles.refLabel}>Reference 1</div>
            <div className={styles.grid3}>
              <div className="field"><label>Full name</label><input value={form.ref1_name} onChange={e=>setF('ref1_name',e.target.value)} placeholder="Jane Smith" /></div>
              <div className="field"><label>Phone</label><input type="tel" value={form.ref1_phone} onChange={e=>setF('ref1_phone',e.target.value)} placeholder="403-555-0100" /></div>
              <div className="field"><label>Relationship</label><input value={form.ref1_relation} onChange={e=>setF('ref1_relation',e.target.value)} placeholder="e.g. Former supervisor" /></div>
            </div>
          </div>
          <div className={styles.refBlock}>
            <div className={styles.refLabel}>Reference 2</div>
            <div className={styles.grid3}>
              <div className="field"><label>Full name</label><input value={form.ref2_name} onChange={e=>setF('ref2_name',e.target.value)} placeholder="Bob Johnson" /></div>
              <div className="field"><label>Phone</label><input type="tel" value={form.ref2_phone} onChange={e=>setF('ref2_phone',e.target.value)} placeholder="403-555-0100" /></div>
              <div className="field"><label>Relationship</label><input value={form.ref2_relation} onChange={e=>setF('ref2_relation',e.target.value)} placeholder="e.g. Coworker" /></div>
            </div>
          </div>
        </div>

        {/* Section 9 — Resume (renumbered) */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>9</span>
            <div>
              <div className={styles.sectionTitle}>Resume</div>
              <div className={styles.sectionSub}>Upload your resume (PDF or Word — optional)</div>
            </div>
          </div>
          <label className={styles.uploadArea}>
            <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>setResumeFile(e.target.files?.[0]||null)} />
            <div className={styles.uploadIcon}>📄</div>
            {resumeFile
              ? <div className={styles.uploadName}>{resumeFile.name}</div>
              : <><div className={styles.uploadText}>Click to upload resume</div><div className={styles.uploadSub}>PDF or Word · Max 10 MB</div></>
            }
          </label>
        </div>

        {/* Section 10 — Cover note */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>10</span>
            <div>
              <div className={styles.sectionTitle}>Anything else?</div>
              <div className={styles.sectionSub}>Optional — tell us why you'd be a great fit</div>
            </div>
          </div>
          <div className="field">
            <textarea value={form.cover_note} onChange={e=>setF('cover_note',e.target.value)} rows={3} placeholder="Anything you'd like us to know…" style={{resize:'vertical',width:'100%'}} />
          </div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <button type="submit" className={styles.submitBtn} disabled={saving}>
          {saving ? 'Submitting…' : 'Submit application →'}
        </button>
        <p className={styles.footNote}>By submitting you agree that INDIMOE Cleaning may store and use this information for hiring purposes.</p>
      </form>
    </div>
  )
}
