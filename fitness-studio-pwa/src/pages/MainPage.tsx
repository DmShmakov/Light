import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PersonIcon from '@mui/icons-material/Person'
import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'

export default function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState(0)

  // Синхронизация навигации с текущим URL
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/class/')) {
      setValue(0)
    } else if (location.pathname === '/my-enrollments') {
      setValue(1)
    } else if (location.pathname === '/profile') {
      setValue(2)
    }
  }, [location])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: 7 }}>
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      
      <BottomNavigation
        value={value}
        onChange={(_event, newValue: number) => {
          setValue(newValue)
          switch (newValue) {
            case 0:
              navigate('/')
              break
            case 1:
              navigate('/my-enrollments')
              break
            case 2:
              navigate('/profile')
              break
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
        <BottomNavigationAction label="Расписание" icon={<CalendarTodayIcon />} />
        <BottomNavigationAction label="Мои записи" icon={<EventNoteIcon />} />
        <BottomNavigationAction label="Профиль" icon={<PersonIcon />} />
      </BottomNavigation>
    </Box>
  )
}
