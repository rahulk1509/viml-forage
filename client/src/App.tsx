import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import CreateProject from './pages/CreateProject'
import Production from './pages/Production'
import ProjectDetails from './pages/ProjectDetails'
import SectionPlaceholder from './pages/SectionPlaceholder'
import Login from './pages/Login'
import Quality from './pages/Quality'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'

function AppContent() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          element={
            <div className="flex min-h-screen bg-slate-100">
              <Sidebar />
              <div className="min-w-0 flex-1">
                <Navbar />
                <OutletRoutes />
              </div>
            </div>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Dashboard />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />
          <Route path="/production" element={<Production />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/documents" element={<Documents />} />
          <Route
            path="/settings"
            element={<SectionPlaceholder title="Settings" />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function OutletRoutes() {
  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App