import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AuthLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <p className="text-sm font-medium text-slate-300">
        Checking authentication...
      </p>
    </main>
  )
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <AuthLoadingState />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'checking') return <AuthLoadingState />
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
