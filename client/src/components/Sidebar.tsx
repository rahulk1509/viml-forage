import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', end: true },
  { label: 'Projects', to: '/projects', end: false },
  { label: 'Production', to: '/production', end: true },
  { label: 'Quality', to: '/quality', end: true },
  { label: 'Reports', to: '/reports', end: true },
  { label: 'Documents', to: '/documents', end: true },
  { label: 'Settings', to: '/settings', end: true },
]

function Sidebar() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 min-h-screen border-r bg-slate-950 text-white p-6">
      <h1 className="text-xl font-bold mb-8">
        VMIL Forge
      </h1>

      <nav className="space-y-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 block w-full rounded-lg px-3 py-2 text-left text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        Sign out
      </button>
    </aside>
  )
}

export default Sidebar