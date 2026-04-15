'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { STORES, getNearestStore, GPS_RADIUS_METRES } from '../../lib/stores'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [gpsStatus, setGpsStatus]       = useState('idle')
  const [nearestStore, setNearestStore] = useState(null)
  const [userCoords, setUserCoords]     = useState(null)

  useEffect(() => { checkLocation() }, [])

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
          // No store name in error message
          setError(`You must be within ${GPS_RADIUS_METRES}m of a store to log in.`)
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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('role, store_id').eq('id', authData.user.id).single()

    if (profile?.role === 'manager') {
      document.cookie = `user_role=manager; path=/; max-age=86400`
      await supabase.from('activity_log').insert({
        user_id: authData.user.id,
        store_id: profile.store_id,
        event: 'login',
      })
      router.push('/dashboard')
      router.refresh()
      return
    }

    if (gpsStatus !== 'ok' || !nearestStore) {
      await supabase.auth.signOut()
      setError('Employees must be at a store location to log in.')
      setLoading(false)
      return
    }

    const { data: storeRow } = await supabase
      .from('stores').select('id').eq('name', nearestStore.name).single()

    if (storeRow) {
      await supabase.from('profiles').update({ store_id: storeRow.id }).eq('id', authData.user.id)
      await supabase.from('activity_log').insert({
        user_id: authData.user.id,
        store_id: storeRow.id,
        event: 'login',
      })
    }

    document.cookie = `user_role=employee; path=/; max-age=86400`
    router.push('/photos')
    router.refresh()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>✦</div>
          <h1 className={styles.logoName}>SwiftClean</h1>
          <p className={styles.logoSub}>INDIMOE Cleaning — Staff Portal</p>
        </div>

        {/* GPS banner — no store name shown, status only */}
        <div className={`${styles.gpsBanner} ${styles['gps_' + gpsStatus]}`}>
          {gpsStatus === 'idle'     && <span>Waiting for location…</span>}
          {gpsStatus === 'checking' && <span>Checking your location…</span>}
          {gpsStatus === 'ok'       && <span>Location verified</span>}
          {gpsStatus === 'tooFar'   && <span>Not at a store location <button className={styles.retryBtn} onClick={checkLocation}>Retry</button></span>}
          {gpsStatus === 'denied'   && <span>Location access denied <button className={styles.retryBtn} onClick={checkLocation}>Retry</button></span>}
        </div>

        {error && gpsStatus !== 'ok' && <p className={styles.errorBox}>{error}</p>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && gpsStatus === 'ok' && <p className={styles.errorBox}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.hint}>Login is restricted to INDIMOE store locations.<br/>No account? Ask the manager.</p>
      </div>
    </div>
  )
}