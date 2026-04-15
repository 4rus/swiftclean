import { redirect } from 'next/navigation'
import { createServerSupabase } from '../../lib/supabase-server'
import Layout from '../../components/Layout'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()

  const isManager = profile?.role === 'manager'
  const today = new Date(); today.setHours(0,0,0,0)

  let jobsQ = supabase.from('jobs').select('*, store:stores(name)').gte('scheduled_time', today.toISOString())
  if (!isManager) jobsQ = jobsQ.eq('store_id', profile?.store_id)
  const { data: todayJobs = [] } = await jobsQ

  const done = todayJobs.filter(j => j.status === 'done').length
  const inProg = todayJobs.filter(j => j.status === 'in_progress').length
  const { count: photoCount } = await supabase.from('photos').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())

  const { data: invoices = [] } = await supabase.from('invoices').select('id').eq('store_id', profile?.store_id)

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <h1 className={styles.title}>Good {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
        <p className={styles.sub}>{profile?.store?.name} · {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className={styles.stats}>
        {[
          { label: 'Jobs today', value: todayJobs.length, color: '' },
          { label: 'Completed', value: done, color: 'var(--green-400)', sub: todayJobs.length ? `${Math.round(done/todayJobs.length*100)}%` : '0%' },
          { label: 'In progress', value: inProg, color: 'var(--blue-400)' },
          { label: 'Photos today', value: photoCount || 0, color: '' },
          { label: 'Invoices', value: invoices.length, color: 'var(--amber-600)' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={s.color ? { color: s.color } : {}}>{s.value}</div>
            {s.sub && <div className={styles.statSub}>{s.sub} done</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Today&apos;s jobs</span>
          <a href="/jobs" className="btn btn-sm">View all →</a>
        </div>
        <table className={styles.table}>
          <thead><tr><th>Client</th>{isManager && <th>Store</th>}<th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {todayJobs.length === 0 && <tr><td colSpan={4} className={styles.empty}>No jobs today yet.</td></tr>}
            {todayJobs.slice(0,6).map(job => (
              <tr key={job.id}>
                <td><div className={styles.clientName}>{job.client_name}</div><div className={styles.clientSub}>{job.location_detail}</div></td>
                {isManager && <td style={{fontSize:12,color:'var(--text-2)'}}>{job.store?.name}</td>}
                <td style={{fontSize:12,color:'var(--text-2)'}}>{job.scheduled_time ? new Date(job.scheduled_time).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td><span className={`badge badge-${job.status==='done'?'done':job.status==='in_progress'?'progress':'pending'}`}>{statusLabel(job.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

function getGreeting() { const h = new Date().getHours(); return h<12?'morning':h<17?'afternoon':'evening' }
function statusLabel(s) { return s==='done'?'Done':s==='in_progress'?'In progress':'Pending' }
