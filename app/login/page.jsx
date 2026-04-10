'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { STORES, getNearestStore, GPS_RADIUS_METRES } from '../../lib/stores'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // GPS state
  const [gpsStatus, setGpsStatus]       = useState('idle') // idle | checking | granted | denied | tooFar | ok
  const [nearestStore, setNearestStore] = useState(null)
  const [userCoords, setUserCoords]     = useState(null)

  // On mount, ask for GPS immediately
  useEffect(() => {
    checkLocation()
  }, [])

  function checkLocation() {
  setGpsStatus('checking')
  setError('')
  if (!navigator.geolocation) {
    setGpsStatus('denied')
    setError('GPS is not supported by your browser.')
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords
      setUserCoords({ lat: latitude, lng: longitude })
      const result = getNearestStore(latitude, longitude)
      if (result && !result.tooFar) {
        setNearestStore(result)
        setGpsStatus('ok')
      } else {
        setNearestStore(result?.nearest || null)
        setGpsStatus('tooFar')
        setError(
          result?.nearest
            ? `You are ${result.distance}m away from ${result.nearest.name}. You must be within ${GPS_RADIUS_METRES}m of a store to log in.`
            : `You are not near any INDIMOE store. Login is only available on-site.`
        )
      }
    },
    err => {
      setGpsStatus('denied')
      setError('Location access was denied. Please enable GPS and try again.')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}
  async function handleLogin(e) {
  e.preventDefault()
  setLoading(true)
  setError('')

  // First sign in to get the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) { setError(authError.message); setLoading(false); return }

  // Check their role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  // Managers can log in from anywhere, employees need GPS
  if (profile?.role === 'manager') {
    router.push('/dashboard')
    router.refresh()
    return
  }

  // Employee — must be on site
  if (profile?.role === 'manager') {
    document.cookie = `user_role=manager; path=/; max-age=86400`
    router.push('/dashboard')
    router.refresh()
    return
  }

  document.cookie = `user_role=employee; path=/; max-age=86400`
router.push('/photos')
router.refresh()
}

  const canLogin = true

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>✦</div>
          <h1 className={styles.logoName}>SwiftClean</h1>
          <p className={styles.logoSub}>INDIMOE Cleaning — Staff Portal</p>
        </div>

        {/* GPS Status Banner */}
        <div className={`${styles.gpsBanner} ${styles['gps_' + gpsStatus]}`}>
          {gpsStatus === 'idle' && <span>⌛ Waiting for location…</span>}
          {gpsStatus === 'checking' && <span>📡 Checking your location…</span>}
          {gpsStatus === 'ok' && <span>✅ Location verified — {nearestStore?.name}</span>}
          {gpsStatus === 'tooFar' && (
            <span>📍 Too far from store
              <button className={styles.retryBtn} onClick={checkLocation}>Retry</button>
            </span>
          )}
          {gpsStatus === 'denied' && (
            <span>🚫 GPS denied
              <button className={styles.retryBtn} onClick={checkLocation}>Retry</button>
            </span>
          )}
        </div>

        {error && gpsStatus !== 'ok' && (
          <p className={styles.errorBox}>{error}</p>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required disabled={!canLogin} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required disabled={!canLogin} />
          </div>
          {error && gpsStatus === 'ok' && <p className={styles.errorBox}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading || !canLogin}>
            {loading ? 'Signing in…' : canLogin ? 'Sign in' : 'Must be on-site to sign in'}
          </button>
        </form>

        <p className={styles.hint}>Login is restricted to INDIMOE store locations.<br/>No account? Ask the manager.</p>
      </div>
    </div>
  )
}
