import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuthStore()

  // Определяем количество кнопок навигации
  const navItems = isAdmin
    ? [
        { label: 'Расписание', path: '/', index: 0, icon: <CalendarTodayIcon /> },
        { label: 'Мои записи', path: '/my-enrollments', index: 1, icon: <EventNoteIcon /> },
        { label: 'Админ', path: '/admin', index: 2, icon: <AdminPanelSettingsIcon /> },
        { label: 'Профиль', path: '/profile', index: 3, icon: <PersonIcon /> },
      ]
    : [
        { label: 'Расписание', path: '/', index: 0, icon: <CalendarTodayIcon /> },
        { label: 'Мои записи', path: '/my-enrollments', index: 1, icon: <EventNoteIcon /> },
        { label: 'Профиль', path: '/profile', index: 2, icon: <PersonIcon /> },
      ]

  // Синхронизация навигации с текущим URL
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/class/')) {
      setValue(0)
    } else if (location.pathname === '/my-enrollments') {
      setValue(1)
    } else if (isAdmin && location.pathname.startsWith('/admin')) {
      setValue(2)
    } else if (location.pathname === '/profile') {
      setValue(isAdmin ? 3 : 2)
    }
  }, [location, isAdmin])

  const [value, setValue] = useState(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/class/')) return 0
    if (location.pathname === '/my-enrollments') return 1
    if (isAdmin && location.pathname.startsWith('/admin')) return 2
    if (location.pathname === '/profile') return isAdmin ? 3 : 2
    return 0
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: 7 }}>
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      <BottomNavigation
        value={value}
        onChange={(_event, newValue: number) => {
          setValue(newValue)
          const item = navItems.find((i) => i.index === newValue)
          if (item) {
            navigate(item.path)
          }
        }}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}
