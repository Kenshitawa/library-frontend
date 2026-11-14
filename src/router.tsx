import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
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

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoading />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/forgot-password',
    element: withSuspense(<ForgotPasswordPage />),
  },
  {
    path: '/',
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
  },
])
