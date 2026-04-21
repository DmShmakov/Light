import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import PersonIcon from '@mui/icons-material/Person'
import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

function buildNavItems(isAdmin: boolean, isTrainer: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: 'Расписание', path: '/', icon: <CalendarTodayIcon /> },
    { label: 'Мои записи', path: '/my-enrollments', icon: <EventNoteIcon /> },
  ]
  if (isTrainer) {
    items.push({ label: 'Мои занятия', path: '/trainer/my-classes', icon: <FitnessCenterIcon /> })
  }
  if (isAdmin) {
    items.push({ label: 'Админ', path: '/admin', icon: <AdminPanelSettingsIcon /> })
  }
  items.push({ label: 'Профиль', path: '/profile', icon: <PersonIcon /> })
  return items
}

function getActiveIndex(pathname: string, items: NavItem[]): number {
  if (pathname === '/' || pathname.startsWith('/class/')) return 0
  const idx = items.findIndex((item) => item.path !== '/' && pathname.startsWith(item.path))
  return idx >= 0 ? idx : 0
}

export default function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isTrainer } = useAuthStore()

  const navItems = buildNavItems(isAdmin, isTrainer)

  const [value, setValue] = useState(() => getActiveIndex(location.pathname, navItems))

  useEffect(() => {
    setValue(getActiveIndex(location.pathname, navItems))
  }, [location.pathname, isAdmin, isTrainer])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: 7 }}>
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      <BottomNavigation
        value={value}
        onChange={(_event, newValue: number) => {
          setValue(newValue)
          const item = navItems[newValue]
          if (item) navigate(item.path)
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
