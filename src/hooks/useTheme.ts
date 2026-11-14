import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? getSystemTheme() : preference
}

export function useTheme() {
  const { profile, user } = useAuth()
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(themePreference))

  // The account preference is authoritative; new profiles follow the device by default.
  useEffect(() => {
    if (profile?.theme === 'light' || profile?.theme === 'dark' || profile?.theme === 'system') {
      setThemePreference(profile.theme)
    }
  }, [profile?.theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const syncTheme = () => setThemeState(themePreference === 'system'
      ? (mediaQuery.matches ? 'dark' : 'light')
      : themePreference)

    syncTheme()
    mediaQuery.addEventListener('change', syncTheme)
    return () => mediaQuery.removeEventListener('change', syncTheme)
  }, [themePreference])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', themePreference)
  }, [theme, themePreference])

  const toggleTheme = async () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setThemePreference(nextTheme)
    setThemeState(nextTheme)

    if (user?.id) {
      try {
        const { error } = await (supabase as any)
          .from('users_profile')
          .update({ theme: nextTheme })
          .eq('id', user.id)
        if (error) throw new Error(error.message)
      } catch (err) {
        console.error('Failed to persist theme preference:', err)
        toast.error('The theme changed on this device, but could not be saved to your account.')
      }
    }
  }

  const setSystemTheme = async () => {
    setThemePreference('system')
    setThemeState(getSystemTheme())
    if (user?.id) {
      try {
        const { error } = await (supabase as any)
          .from('users_profile')
          .update({ theme: 'system' })
          .eq('id', user.id)
        if (error) throw new Error(error.message)
      } catch (err) {
        console.error('Failed to persist system theme preference:', err)
        toast.error('System appearance is active on this device but could not be saved to your account.')
      }
    }
  }

  return {
    theme,
    themePreference,
    toggleTheme,
    setSystemTheme,
    isDark: theme === 'dark',
  }
}
