import React, { useState } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Home,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `The server returned status ${error.status}.`
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred.'
}

function errorStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) return error.stack
  return null
}

/**
 * Router-level safety net: keeps a render or lazy-load failure from turning the
 * whole app into a blank screen, and gives the reader a way back.
 */
export const RouteErrorPage: React.FC = () => {
  const error = useRouteError()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const message = errorMessage(error)
  const stack = errorStack(error)

  const handleCopy = async () => {
    const details = stack ? `${message}\n\n${stack}` : message
    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-abyss px-4 py-12 sm:px-6">
      <div className="hub-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="hub-ambient pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel/90 p-6 text-center shadow-[0_24px_70px_-32px_rgba(0,0,0,0.75)] panel-sheen sm:p-8">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl border ${
            isNotFound
              ? 'border-sky-accent/30 bg-sky-accent/10 text-sky-accent'
              : 'border-caution/30 bg-caution/10 text-caution'
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          {isNotFound ? 'Page not found' : 'Unexpected error'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-heading">
          {isNotFound ? 'That page is not on our shelves.' : 'We hit a snag loading this page.'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {isNotFound
            ? 'The link may be out of date. Head back to the dashboard to keep working.'
            : 'Your library data is safe. Reload the page to try again, or go back to the dashboard.'}
        </p>

        <div className="mt-5 rounded-xl border border-line bg-surface-1 p-3 text-left">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 break-words font-mono text-[11px] leading-5 text-muted">
              {message}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-panel px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:text-heading"
            >
              {copied ? <Check className="h-3 w-3 text-positive" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {import.meta.env.DEV && stack && (
            <details className="mt-2 border-t border-line pt-2">
              <summary className="cursor-pointer text-[11px] font-medium text-faint hover:text-body">
                Technical details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-faint">
                {stack}
              </pre>
            </details>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
          <Button
            variant="outline"
            leftIcon={<Home className="h-4 w-4" />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
          <Button
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
