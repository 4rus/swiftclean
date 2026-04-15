import { redirect } from 'next/navigation'
import { createServerSupabase } from '../../lib/supabase-server'
import Layout from '../../components/Layout'
import styles from './stores.module.css'

export default async function StoresPage() {
  const supabase = createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', session.user.id).single()
  if (profile?.role !== 'manager') redirect('/dashboard')

  const { data: stores = [] } = await supabase.from('stores').select('*')

  // Get job stats per store
  const today = new Date(); today.setHours(0,0,0,0)
  const { data: todayJobs = [] } = await supabase.from('jobs').select('store_id, status').gte('scheduled_time', today.toISOString())

  const storeStats = stores.map(s => {
    const sJobs = todayJobs.filter(j => j.store_id === s.id)
    const done = sJobs.filter(j => j.status === 'done').length
    return { ...s, total: sJobs.length, done, pct: sJobs.length ? Math.round(done/sJobs.length*100) : 0 }
  })

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>All Stores</h1><p className={styles.sub}>INDIMOE Cleaning — {stores.length} locations</p></div>
      </div>
      <div className={styles.grid}>
        {storeStats.map(s => (
          <div key={s.id} className={`card ${styles.storeCard}`}>
            <div className={styles.storeIcon}>🏢</div>
            <div className={styles.storeName}>{s.name}</div>
            <div className={styles.storeAddr}>{s.address}</div>
            <div className={styles.storeDivider} />
            <div className={styles.storeStats}>
              <div className={styles.storeStat}>
                <strong style={{color:'var(--teal-400)'}}>{s.total}</strong>
                <span>Jobs today</span>
              </div>
              <div className={styles.storeStat}>
                <strong style={{color:'var(--green-400)'}}>{s.done}</strong>
                <span>Completed</span>
              </div>
              <div className={styles.storeStat}>
                <strong>{s.pct}%</strong>
                <span>Done</span>
              </div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width:`${s.pct}%`, background: s.pct===100?'var(--green-400)':s.pct>50?'var(--teal-400)':'var(--amber-400)'}} />
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
