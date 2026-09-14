import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type AuthUser } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function readError(response: Response, fallback: string) {
    try {
      const data: { error?: string } = await response.json()
      return data.error ?? fallback
    } catch {
      return fallback
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      if (!loginResponse.ok) {
        throw new Error(
          await readError(
            loginResponse,
            loginResponse.status === 401
              ? 'Invalid email or password.'
              : `Unable to sign in (${loginResponse.status})`,
          ),
        )
      }

      const loginData: { user?: AuthUser } = await loginResponse.json()
      if (!loginData.user) {
        throw new Error('The login response was invalid.')
      }

      const meResponse = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include',
      })

      if (!meResponse.ok) {
        throw new Error(
          await readError(
            meResponse,
            `Unable to verify your session (${meResponse.status})`,
          ),
        )
      }

      const meData: { user?: AuthUser } = await meResponse.json()
      if (!meData.user) {
        throw new Error('The authenticated user response was invalid.')
      }

      setUser(meData.user)
      navigate('/dashboard')
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? 'Unable to reach the authentication server.'
          : requestError instanceof Error
            ? requestError.message
            : 'Unable to sign in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            VMIL Forge
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Sign in to your workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Access project delivery, production operations, and quality
            workflows.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-white p-6 shadow-2xl"
        >
          <div className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
