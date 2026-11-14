import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

const INACTIVITY_WARNING_MS = 8 * 60 * 1000
const LOGOUT_MS = 10 * 60 * 1000

export function useSessionTimeout() {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const warningVisibleRef = useRef(false)
  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleRef = useRef<(lastActivity: number) => void>(() => {})

  const readLastActivity = useCallback(() => {
    if (!user?.id) return lastActivityRef.current
    try {
      const saved = Number(localStorage.getItem(`library:last-activity:${user.id}`))
      if (Number.isFinite(saved) && saved > 0) {
        lastActivityRef.current = Math.max(lastActivityRef.current, saved)
      }
    } catch (error) {
      console.warn('Could not read the shared session activity time.', error)
    }
    return lastActivityRef.current
  }, [user?.id])

  scheduleRef.current = useCallback((lastActivity: number) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)

    lastActivityRef.current = lastActivity
    warningVisibleRef.current = false
    setShowWarning(false)

    const warningDelay = Math.max(0, lastActivity + INACTIVITY_WARNING_MS - Date.now())
    const logoutDelay = Math.max(0, lastActivity + LOGOUT_MS - Date.now())

    warningTimerRef.current = setTimeout(() => {
      const latestActivity = readLastActivity()
      if (Date.now() - latestActivity >= INACTIVITY_WARNING_MS) {
        warningVisibleRef.current = true
        setShowWarning(true)
      } else {
        scheduleRef.current(latestActivity)
      }
    }, warningDelay)

    logoutTimerRef.current = setTimeout(async () => {
      const latestActivity = readLastActivity()
      if (Date.now() - latestActivity < LOGOUT_MS) {
        scheduleRef.current(latestActivity)
        return
      }

      toast.info('You were signed out after 10 minutes of inactivity.')
      try {
        await signOut()
      } catch (error) {
        console.error('Automatic sign-out failed.', error)
      }
    }, logoutDelay)
  }, [readLastActivity, signOut])

  const recordActivity = useCallback(() => {
    if (!user?.id || warningVisibleRef.current) return
    const now = Date.now()
    lastActivityRef.current = now
    try {
      localStorage.setItem(`library:last-activity:${user.id}`, String(now))
    } catch (error) {
      console.warn('Could not share session activity across tabs.', error)
    }
    scheduleRef.current(now)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      warningVisibleRef.current = false
      setShowWarning(false)
      return
    }

    const key = `library:last-activity:${user.id}`
    const initialActivity = readLastActivity()
    scheduleRef.current(initialActivity)

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null
    const handleActivity = () => {
      if (throttleTimeout) return
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null
        recordActivity()
      }, 1000)
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return
      const timestamp = Number(event.newValue)
      if (Number.isFinite(timestamp) && timestamp > 0) {
        scheduleRef.current(timestamp)
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      scheduleRef.current(readLastActivity())
    }

    events.forEach((event) => window.addEventListener(event, handleActivity))
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (throttleTimeout) clearTimeout(throttleTimeout)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    }
  }, [user?.id, readLastActivity, recordActivity])

  const stayLoggedIn = useCallback(() => {
    warningVisibleRef.current = false
    recordActivity()
  }, [recordActivity])

  return { showWarning, stayLoggedIn }
}
