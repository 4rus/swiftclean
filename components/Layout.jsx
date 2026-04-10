'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase'
import styles from './Layout.module.css'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',    dot: 'teal',  roles: ['manager'] },
  { href: '/jobs',         label: 'Jobs',         dot: 'blue',  roles: ['manager'] },
  { href: '/photos',       label: 'Photos',       dot: 'teal',  roles: ['employee','manager'] },
  { href: '/checklist',    label: 'Checklist',    dot: 'green', roles: ['manager'] },
  { href: '/invoices',     label: 'Invoices',     dot: 'amber', roles: ['manager'] },
  { href: '/applications', label: 'Applications', dot: 'green', roles: ['manager'] },
  { href: '/stores',       label: 'All Stores',   dot: 'amber', roles: ['manager'] },
  { href: '/employees',    label: 'Employees',    dot: 'amber', roles: ['manager'] },
]

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

export default function Layout({ children, profile, store }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [notifCount, setNotifCount] = useState(0)

  const cookieRole = typeof document !== 'undefined' 
  ? document.cookie.split(';').find(c => c.trim().startsWith('user_role='))?.split('=')[1] 
  : null
const role = profile?.role || cookieRole || 'employee'

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('is_read', false)
      .then(({ count }) => setNotifCount(count || 0))
  }, [profile?.id])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const mainNav = NAV.filter(n => n.roles.includes(role) && !['applications','stores','employees'].includes(n.href.slice(1)))
  const manageNav = NAV.filter(n => n.roles.includes(role) && ['applications','stores','employees'].includes(n.href.slice(1)))

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>✦</div>
          <div>
            <span className={styles.logoText}>SwiftClean</span>
            <span className={styles.logoBrand}>INDIMOE Cleaning</span>
          </div>
        </div>
        <div className={styles.topRight}>
          {store && <span className={styles.storeBadge}>📍 {store.name}</span>}
          {notifCount > 0 && <span className={styles.notifDot}>{notifCount}</span>}
          <div className={styles.userPill}>
            <div className={styles.avatar}>{initials(profile?.full_name)}</div>
            <div>
              <div className={styles.userName}>{profile?.full_name || 'User'}</div>
              <div className={styles.userRole}>{role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>↩ Sign out</button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar}>
          <div className={styles.navSection}>Main</div>
          {mainNav.map(n => (
            <a key={n.href} href={n.href} className={`${styles.navItem} ${pathname === n.href ? styles.active : ''}`}>
              <span className={`${styles.dot} ${styles[n.dot]}`} />
              {n.label}
            </a>
          ))}
          {role === 'manager' && manageNav.length > 0 && (
            <>
              <div className={styles.navSection}>Manage</div>
              {manageNav.map(n => (
                <a key={n.href} href={n.href} className={`${styles.navItem} ${pathname === n.href ? styles.active : ''}`}>
                  <span className={`${styles.dot} ${styles[n.dot]}`} />
                  {n.label}
                </a>
              ))}
            </>
          )}
        </nav>
        <main className={styles.main} key={pathname}>{children}</main>
      </div>
    </div>
  )
}