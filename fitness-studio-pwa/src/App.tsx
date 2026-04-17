import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

export const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin'
const AUTH_ROUTES = ['/welcome', '/login', '/register', '/recovery']

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
import NotificationSettingsPage from './pages/NotificationSettingsPage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSchedulePage from './pages/admin/AdminSchedulePage'
import AdminCreateClassPage from './pages/admin/AdminCreateClassPage'
import AdminParticipantsPage from './pages/admin/AdminParticipantsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'

// Notification handler
import { NotificationHandler } from './components/NotificationSnackbar'

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

// Redirect неавторизованных на welcome
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Главная: неавторизованных → welcome, авторизованных → расписание
function HomeRoute() {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) {
    if (!AUTH_ROUTES.includes(location.pathname)) {
      sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, location.pathname + location.search)
    }
    return <Navigate to="/welcome" replace />
  }

  return <MainPage />
}

// Protected route component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    if (!AUTH_ROUTES.includes(location.pathname)) {
      sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, location.pathname + location.search)
    }
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
    <>
      <NotificationHandler />
      <Routes>
      {/* Auth routes (только для неавторизованных) */}
      <Route path="/welcome" element={<GuestRoute><WelcomePage /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/recovery" element={<PasswordRecoveryPage />} />

      {/* Main routes */}
      <Route path="/" element={<HomeRoute />}>
        <Route index element={<SchedulePage />} />
        <Route path="my-enrollments" element={<MyEnrollmentsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationSettingsPage />} />

        {/* Admin routes — внутри MainPage чтобы была навигация */}
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/schedule"
          element={
            <ProtectedRoute requireAdmin>
              <AdminSchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/schedule/create"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCreateClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/schedule/edit/:classId"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCreateClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/participants/:classId"
          element={
            <ProtectedRoute requireAdmin>
              <AdminParticipantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route
        path="/class/:classId"
        element={
          <ProtectedRoute>
            <ClassDetailsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
