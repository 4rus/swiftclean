import { redirect } from 'next/navigation'
import { createServerSupabase } from '../../lib/supabase-server'
import Layout from '../../components/Layout'
import styles from './jobs.module.css'

export default async function JobsPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
  const isManager = profile?.role === 'manager'

  let q = supabase.from('jobs').select('*, store:stores(name), assigned:profiles(full_name)').order('scheduled_time', { ascending: false })
  if (!isManager) q = q.eq('store_id', profile?.store_id)
  const { data: jobsRaw } = await q
  const jobs = jobsRaw || []  

  function sl(s) { return s==='done'?'Done':s==='in_progress'?'In progress':'Pending' }
  function sc(s) { return s==='done'?'done':s==='in_progress'?'progress':'pending' }

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Jobs</h1><p className={styles.sub}>All cleaning jobs for your location</p></div>
        <a href="/jobs/new" className="btn btn-primary">+ New job</a>
      </div>
      <div className="card">
        <table className={styles.table}>
          <thead><tr><th>Client</th><th>Location detail</th>{isManager&&<th>Store</th>}<th>Employee</th><th>Scheduled</th><th>Status</th></tr></thead>
          <tbody>
            {jobs.length===0&&<tr><td colSpan={6} className={styles.empty}>No jobs yet.</td></tr>}
            {jobs.map(j=>(
              <tr key={j.id}>
                <td style={{fontWeight:500}}>{j.client_name}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{j.location_detail||'—'}</td>
                {isManager&&<td style={{fontSize:12,color:'var(--text-2)'}}>{j.store?.name}</td>}
                <td style={{fontSize:12}}>{j.assigned?.full_name||'Unassigned'}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{j.scheduled_time?new Date(j.scheduled_time).toLocaleString('en-CA',{dateStyle:'short',timeStyle:'short'}):'—'}</td>
                <td><span className={`badge badge-${sc(j.status)}`}>{sl(j.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
