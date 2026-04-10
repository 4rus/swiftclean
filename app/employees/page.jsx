import { redirect } from 'next/navigation'
import { createServerSupabase } from '../../lib/supabase-server'
import Layout from '../../components/Layout'
import styles from './employees.module.css'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default async function EmployeesPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
  if (profile?.role !== 'manager') redirect('/dashboard')

  const { data: employees = [] } = await supabase
    .from('profiles')
    .select('*, store:stores(name)')
    .order('full_name')

  return (
    <Layout profile={profile} store={profile?.store}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Employees</h1><p className={styles.sub}>All staff across INDIMOE locations</p></div>
        <a href="/employees/invite" className="btn btn-primary">+ Invite employee</a>
      </div>
      <div className="card">
        <table className={styles.table}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Store</th><th>Role</th></tr>
          </thead>
          <tbody>
            {employees.length === 0 && <tr><td colSpan={4} className={styles.empty}>No employees yet.</td></tr>}
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div className={styles.nameCell}>
                    <div className={styles.avatar} style={{background:'var(--teal-50)',color:'var(--teal-600)'}}>
                      {initials(emp.full_name)}
                    </div>
                    <span style={{fontWeight:500}}>{emp.full_name || 'No name set'}</span>
                  </div>
                </td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{emp.email || '—'}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{emp.store?.name || 'No store assigned'}</td>
                <td><span className={`badge badge-${emp.role}`}>{emp.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
