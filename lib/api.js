import { supabase } from './supabase'

// ── JOBS ──────────────────────────────────────────────────────

export async function getJobs(storeId = null) {
  let query = supabase
    .from('jobs')
    .select('*, stores(name), profiles(full_name)')
    .order('scheduled_at', { ascending: true })

  if (storeId) query = query.eq('store_id', storeId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTodaysJobs(storeId = null) {
  const today = new Date().toISOString().split('T')[0]
  let query = supabase
    .from('jobs')
    .select('*, stores(name), profiles(full_name)')
    .gte('scheduled_at', today + 'T00:00:00')
    .lte('scheduled_at', today + 'T23:59:59')
    .order('scheduled_at', { ascending: true })

  if (storeId) query = query.eq('store_id', storeId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createJob(job) {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJobStatus(jobId, status) {
  const { data, error } = await supabase
    .from('jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeJob(jobId, employeeId) {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: employeeId,
    })
    .eq('id', jobId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── PHOTOS ────────────────────────────────────────────────────

export async function getPhotos(jobId) {
  const { data, error } = await supabase
    .from('photos')
    .select('*, profiles(full_name)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadPhoto(jobId, file, type = 'after', uploadedBy) {
  const ext = file.name.split('.').pop()
  const fileName = `${jobId}/${type}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('job-photos')
    .getPublicUrl(fileName)

  const { data, error } = await supabase
    .from('photos')
    .insert({
      job_id: jobId,
      url: publicUrl,
      storage_path: fileName,
      type,
      uploaded_by: uploadedBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePhoto(photoId, storagePath) {
  await supabase.storage.from('job-photos').remove([storagePath])
  const { error } = await supabase.from('photos').delete().eq('id', photoId)
  if (error) throw error
}

// ── CHECKLISTS ────────────────────────────────────────────────

export async function getChecklist(jobId) {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('job_id', jobId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function toggleChecklistItem(itemId, checked, checkedBy) {
  const { data, error } = await supabase
    .from('checklist_items')
    .update({
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? checkedBy : null,
    })
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createDefaultChecklist(jobId) {
  const defaultItems = [
    'Strip and replace bed linens',
    'Vacuum all carpeted areas',
    'Wipe all surfaces and desk',
    'Clean and disinfect bathroom',
    'Restock towels and toiletries',
    'Empty all bins and replace liners',
    'Final walkthrough and photo',
  ]

  const { data, error } = await supabase
    .from('checklist_items')
    .insert(defaultItems.map((label, i) => ({
      job_id: jobId,
      label,
      position: i,
      checked: false,
    })))
    .select()

  if (error) throw error
  return data
}

// ── STORES ────────────────────────────────────────────────────

export async function getStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function getStoreStats(storeId) {
  const today = new Date().toISOString().split('T')[0]

  const { data: jobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('store_id', storeId)
    .gte('scheduled_at', today + 'T00:00:00')

  const total = jobs?.length ?? 0
  const completed = jobs?.filter(j => j.status === 'completed').length ?? 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const { count: employeeCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)

  return { total, completed, pct, employeeCount: employeeCount ?? 0 }
}

// ── EMPLOYEES ─────────────────────────────────────────────────

export async function getEmployees(storeId = null) {
  let query = supabase
    .from('profiles')
    .select('*, stores(name)')
    .order('full_name', { ascending: true })

  if (storeId) query = query.eq('store_id', storeId)

  const { data, error } = await query
  if (error) throw error
  return data
}

// ── NOTIFICATIONS ─────────────────────────────────────────────

export async function notifyManager(storeId, message, jobId = null) {
  const { error } = await supabase
    .from('notifications')
    .insert({ store_id: storeId, message, job_id: jobId, type: 'job_complete' })
  if (error) throw error
}

export async function getNotifications(storeId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('store_id', storeId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function markNotificationRead(notifId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId)
  if (error) throw error
}
