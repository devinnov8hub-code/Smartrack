import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginScreen } from './components/LoginScreen'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Register } from './components/Register'
import { useUserContext } from './lib/context'
import AdminHome from './pages/admin/AdminHome'
import AdminTracking from './pages/admin/AdminTracking'
import CreateOrder from './pages/admin/CreateOrder'
import RiderHome from './pages/rider/RiderHome'
import RiderLayout from './pages/rider/RiderLayout'
import RiderTrip from './pages/rider/RiderTrip'

/** Sends a signed-in user to their own home, and everyone else to the login. */
function HomeRedirect() {
  const { user, loading } = useUserContext()
  if (loading) return null
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* One login for admins and riders; the account's role decides where they land */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<Register />} />
      {/* The old per-role addresses still work */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/rider/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/register" element={<Navigate to="/register" replace />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
      <Route path="/admin/orders/new" element={<ProtectedRoute role="admin"><CreateOrder /></ProtectedRoute>} />
      <Route path="/admin/track/:trackingNumber" element={<ProtectedRoute role="admin"><AdminTracking /></ProtectedRoute>} />

      <Route element={<ProtectedRoute role="rider"><RiderLayout /></ProtectedRoute>}>
        <Route path="/rider" element={<RiderHome />} />
        <Route path="/rider/trips/:trackingNumber" element={<RiderTrip />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
