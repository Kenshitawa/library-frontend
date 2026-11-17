import React from 'react'
import { Link } from 'react-router-dom'
import { BookX, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-950/60 mb-6 shadow-sm">
        <BookX className="h-10 w-10" />
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">
        404
      </h1>
      <h2 className="mt-2 text-xl font-semibold text-body">
        Page Not Found
      </h2>
      <p className="mt-2 text-sm text-faint max-w-sm">
        The catalog card or shelf page you are looking for has been moved or doesn't exist.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
