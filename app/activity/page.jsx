import { redirect } from 'next/navigation'
import { createServerSupabase } from '../../lib/supabase-server'
import Layout from '../../components/Layout'
import styles from './activity.module.css'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

export default async function ActivityPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
  if (profile?.role !== 'manager') redirect('/photos')

  const { data: logsRaw } = await supabase
    .from('activity_log')
    .select('*, user:profiles(full_name, email), store:stores(name)')
    .order('created_at', { ascending: false })
    .limit(100)
const logs = logsRaw || []

  // Get unique employees currently logged in (last event is login)
  const latestByUser = {}
  for (const log of [...logs].reverse()) {
    latestByUser[log.user_id] = log
  }
  const loggedIn = Object.values(latestByUser).filter(l => l.event === 'login')

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity Log</h1>
          <p className={styles.sub}>Employee login & logout tracking</p>
        </div>
      </div>

      {/* Currently logged in */}
      <div className="card">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Currently on shift</span>
          <span className={styles.liveTag}>● Live</span>
        </div>
        {loggedIn.length === 0 && (
          <div className={styles.empty}>No employees currently logged in.</div>
        )}
        <div className={styles.onlineList}>
          {loggedIn.map(log => (
            <div key={log.user_id} className={styles.onlineRow}>
              <div className={styles.onlineAvatar} style={{background:'var(--green-50)',color:'var(--green-600)'}}>
                {initials(log.user?.full_name)}
              </div>
              <div className={styles.onlineInfo}>
                <div className={styles.onlineName}>{log.user?.full_name || log.user?.email}</div>
                <div className={styles.onlineStore}>{log.store?.name || 'Unknown store'}</div>
              </div>
              <div className={styles.onlineTime}>Logged in {timeAgo(log.created_at)}</div>
              <span className={styles.onlinePill}>On shift</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full log */}
      <div className="card">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Recent activity</span>
        </div>
        <table className={styles.table}>
          <thead>
            <tr><th>Employee</th><th>Store</th><th>Event</th><th>Time</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={4} className={styles.empty}>No activity recorded yet.</td></tr>
            )}
            {logs.map(log => (
              <tr key={log.id}>
                <td>
                  <div className={styles.empCell}>
                    <div className={styles.empAvatar}>{initials(log.user?.full_name)}</div>
                    <div>
                      <div style={{fontWeight:500}}>{log.user?.full_name || '—'}</div>
                      <div style={{fontSize:11,color:'var(--text-3)'}}>{log.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{log.store?.name || '—'}</td>
                <td>
                  <span className={`${styles.eventPill} ${log.event === 'login' ? styles.eLogin : styles.eLogout}`}>
                    {log.event === 'login' ? '↗ Logged in' : '↙ Logged out'}
                  </span>
                </td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>
                  <div>{new Date(log.created_at).toLocaleDateString('en-CA')}</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>{new Date(log.created_at).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
