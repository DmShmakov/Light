import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Auth pages
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'

// Main pages
import MainPage from './pages/MainPage'
import SchedulePage from './pages/SchedulePage'
import ClassDetailsPage from './pages/ClassDetailsPage'
import MyEnrollmentsPage from './pages/MyEnrollmentsPage'
import ProfilePage from './pages/ProfilePage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSchedulePage from './pages/admin/AdminSchedulePage'
import AdminCreateClassPage from './pages/admin/AdminCreateClassPage'
import AdminParticipantsPage from './pages/admin/AdminParticipantsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'

// Loading component
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

function LoadingScreen() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}

// Protected route component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuthStore()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  const { loading } = useAuthStore()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/recovery" element={<PasswordRecoveryPage />} />

      {/* Main routes */}
      <Route path="/" element={<MainPage />}>
        <Route index element={<SchedulePage />} />
        <Route path="my-enrollments" element={<MyEnrollmentsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/class/:classId" element={<ClassDetailsPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedule"
        element={
          <ProtectedRoute requireAdmin>
            <AdminSchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedule/create"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCreateClassPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedule/edit/:classId"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCreateClassPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/participants/:classId"
        element={
          <ProtectedRoute requireAdmin>
            <AdminParticipantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
