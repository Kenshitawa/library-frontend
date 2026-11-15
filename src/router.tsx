import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, isRouteErrorResponse, Link, Navigate, useRouteError } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((module) => ({ default: module.CatalogPage })))
const TitleDetailPage = lazy(() => import('@/pages/TitleDetailPage').then((module) => ({ default: module.TitleDetailPage })))
const BorrowersPage = lazy(() => import('@/pages/BorrowersPage').then((module) => ({ default: module.BorrowersPage })))
const BorrowerDetailPage = lazy(() => import('@/pages/BorrowerDetailPage').then((module) => ({ default: module.BorrowerDetailPage })))
const IssueDesk = lazy(() => import('@/pages/IssueDesk').then((module) => ({ default: module.IssueDesk })))
const ReturnDesk = lazy(() => import('@/pages/ReturnDesk').then((module) => ({ default: module.ReturnDesk })))
const ReturnsPage = lazy(() => import('@/pages/ReturnsPage').then((module) => ({ default: module.ReturnsPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage').then((module) => ({ default: module.AuditLogPage })))
const ChargesPage = lazy(() => import('@/pages/ChargesPage').then((module) => ({ default: module.ChargesPage })))
const ReservationsPage = lazy(() => import('@/pages/ReservationsPage').then((module) => ({ default: module.ReservationsPage })))
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const TeacherPortalPage = lazy(() => import('@/pages/TeacherPortalPage').then((module) => ({ default: module.TeacherPortalPage })))

const PageLoading: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status">
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    <span className="sr-only">Loading page…</span>
  </div>
)

const RouteErrorPage: React.FC = () => {
  const error = useRouteError()
  const isChunkError = error instanceof Error && /dynamically imported module|loading chunk|failed to fetch/i.test(error.message)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5eb] px-5 py-12 dark:bg-[#14231c]">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-800 dark:bg-amber-950 dark:text-amber-200">!</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">This page could not open</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isChunkError
            ? 'A newer version of the library system is available. Reload the page to continue.'
            : isRouteErrorResponse(error)
              ? `The requested page returned an error (${error.status}).`
              : 'Something went wrong while loading this page. Your library data is still saved.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Reload page
          </button>
          <Link to="/catalog" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Go to catalog
          </Link>
          <Link to="/borrowers" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Go to borrowers
          </Link>
        </div>
      </section>
    </main>
  )
}

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoading />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/forgot-password',
    element: withSuspense(<ForgotPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/reset-password',
    element: withSuspense(<ResetPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/',
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        {withSuspense(<AppLayout />)}
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<DashboardPage />),
      },
      {
        path: 'catalog',
        element: withSuspense(<CatalogPage />),
      },
      {
        path: 'catalog/:titleId',
        element: withSuspense(<TitleDetailPage />),
      },
      {
        path: 'borrowers',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<BorrowersPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'borrowers/:borrowerId',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<BorrowerDetailPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'issue',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<IssueDesk />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'return',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<ReturnDesk />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'returns',
        element: withSuspense(<ReturnsPage />),
      },
      {
        path: 'notifications',
        element: withSuspense(<NotificationsPage />),
      },
      {
        path: 'calendar',
        element: <Navigate to="/returns" replace />,
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<UsersPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<SettingsPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<AuditLogPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'charges',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<ChargesPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'reservations',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<ReservationsPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredRole="librarian">
            {withSuspense(<ReportsPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher',
        element: (
          <ProtectedRoute requiredRole="teacher">
            {withSuspense(<TeacherPortalPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: withSuspense(<NotFoundPage />),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
    errorElement: <RouteErrorPage />,
  },
])

