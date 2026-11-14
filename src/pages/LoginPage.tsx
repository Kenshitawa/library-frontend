import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AlertCircle, BookOpen, Library } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { toast } from 'sonner'

const LOGIN_SLIDES = [
  {
    image: '/images/library-open-book.svg',
    alt: 'An open book surrounded by the colors of the school library',
    title: 'Pages passed between readers.',
    description: 'Every book shared is a new chance to learn, imagine and grow.',
    note: 'A library grows with every reader.',
  },
  {
    image: '/images/library-bookshelf.svg',
    alt: 'A colorful shelf of books ready to be borrowed',
    title: 'A shelf full of new paths.',
    description: 'Find the right book, make it easy to borrow, and bring it back for the next reader.',
    note: 'Good stories make good company.',
  },
  {
    image: '/images/library-reading.svg',
    alt: 'A reader discovering a book beneath a library lamp',
    title: 'Read today. Imagine further.',
    description: 'A thoughtful library helps every learner find room to explore.',
    note: 'One more page can change a day.',
  },
]

export const LoginPage: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { profile: libProfile } = useLibraryProfile()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  useEffect(() => {
    if ((location.state as any)?.accountInactive) {
      setError('This account is inactive. Contact your librarian for help.')
    }
  }, [location.state])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % LOGIN_SLIDES.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    toast.loading('Signing you in…', { id: 'library-sign-in' })

    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        toast.dismiss('library-sign-in')
        setError(signInError.message || 'Invalid email or password.')
      } else {
        toast.success('Welcome to the library.', { id: 'library-sign-in' })
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      toast.dismiss('library-sign-in')
      setError(err?.message || 'An unexpected error occurred during login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-0 dark:bg-slate-950 lg:p-5">
      <main className="mx-auto grid min-h-screen max-w-7xl bg-white dark:bg-slate-950 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-2 lg:overflow-hidden lg:rounded-2xl lg:shadow-2xl">
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                {libProfile?.logo_url ? (
                  <img
                    src={libProfile.logo_url}
                    alt="Library logo"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <Library className="h-6 w-6" />
                )}
              </div>
              <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {libProfile?.name || 'School Library System'}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign in to manage books, readers and returns.
              </p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-danger-50 p-3 text-xs font-medium text-danger dark:bg-red-950/50">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Input
                    label="Email Address"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@school.example"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />

                  <div>
                    <Input
                      label="Password"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="mt-1.5 text-right">
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="mt-2 w-full"
                  >
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-5 text-center text-xs text-slate-400">
              Need an account? Contact your school librarian to receive an invitation.
            </p>

            <div className="mt-7 rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950 lg:hidden">
              <img
                src={LOGIN_SLIDES[activeSlide].image}
                alt={LOGIN_SLIDES[activeSlide].alt}
                className="mb-3 h-28 w-full object-contain"
              />
              <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                {LOGIN_SLIDES[activeSlide].title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-primary-800 dark:text-primary-200">
                {LOGIN_SLIDES[activeSlide].description}
              </p>
            </div>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-primary-950 px-12 py-14 text-white lg:flex lg:items-center xl:px-20">
          <div className="relative z-10 grid w-full grid-cols-[1fr_0.9fr] items-center gap-8">
            <div className="max-w-lg">
              <BookOpen className="h-8 w-8 text-primary-200" strokeWidth={1.5} />
              <p className="mt-8 text-sm font-medium text-primary-200">
                {libProfile?.name || 'Your school library'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl" aria-live="polite">
                {LOGIN_SLIDES[activeSlide].title}
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-primary-100/80">
                {LOGIN_SLIDES[activeSlide].description}
              </p>
              <div className="mt-10 border-l-2 border-primary-300 pl-4">
                <p className="text-sm font-medium text-white">
                  {LOGIN_SLIDES[activeSlide].note}
                </p>
                <p className="mt-1 text-xs text-primary-200">A reminder from your library team</p>
              </div>
              <div className="mt-8 flex items-center gap-2" aria-label="Login image selection">
                {LOGIN_SLIDES.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    aria-label={`Show image ${index + 1}`}
                    aria-current={index === activeSlide}
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      index === activeSlide ? 'w-7 bg-white' : 'w-2.5 bg-primary-300/60 hover:bg-primary-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <img
              src={LOGIN_SLIDES[activeSlide].image}
              alt={LOGIN_SLIDES[activeSlide].alt}
              className="w-full max-w-[330px] justify-self-end rounded-2xl shadow-2xl"
            />
          </div>
        </aside>
      </main>
    </div>
  )
}
