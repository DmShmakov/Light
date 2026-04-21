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
import { buildNavConfig, getActiveNavIndex } from './mainPageNav'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  'Расписание': <CalendarTodayIcon />,
  'Мои записи': <EventNoteIcon />,
  'Мои занятия': <FitnessCenterIcon />,
  'Админ': <AdminPanelSettingsIcon />,
  'Профиль': <PersonIcon />,
}

function buildNavItems(isAdmin: boolean, isTrainer: boolean): NavItem[] {
  return buildNavConfig(isAdmin, isTrainer).map((cfg) => ({
    ...cfg,
    icon: NAV_ICONS[cfg.label],
  }))
}

export default function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isTrainer } = useAuthStore()

  const navItems = buildNavItems(isAdmin, isTrainer)

  const [value, setValue] = useState(() => getActiveNavIndex(location.pathname, navItems))

  useEffect(() => {
    setValue(getActiveNavIndex(location.pathname, navItems))
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
