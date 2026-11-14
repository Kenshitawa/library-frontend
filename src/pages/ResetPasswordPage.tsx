import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Library } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setHasSession(Boolean(session))
      setSessionReady(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setHasSession(Boolean(session))
      setSessionReady(true)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
      } else {
        setComplete(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md">
            <Library className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Set your password
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">School Library System</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8">
            {!sessionReady ? (
              <p className="text-center text-sm text-slate-500" role="status">Checking your secure link…</p>
            ) : complete ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Password updated</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your account is ready. Sign in with your email and new password.</p>
                <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
                  Go to sign in
                </Button>
              </div>
            ) : hasSession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-danger-50 p-3 text-xs font-medium text-danger dark:bg-red-950/50" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <Button type="submit" className="w-full" loading={saving}>
                  Save password
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">This secure link has expired or was already used. Request a fresh password link to continue.</p>
                <Link to="/forgot-password" className="block">
                  <Button className="w-full">Request a new link</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

