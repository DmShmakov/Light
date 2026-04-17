import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { addDays, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useScheduleStore } from '../store/scheduleStore'

export default function WeekNavigator() {
  const { selectedWeekStart, setSelectedWeekStart } = useScheduleStore()

  const goToPreviousWeek = () => {
    const prev = new Date(selectedWeekStart)
    prev.setDate(prev.getDate() - 7)
    setSelectedWeekStart(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(selectedWeekStart)
    next.setDate(next.getDate() + 7)
    setSelectedWeekStart(next)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <IconButton onClick={goToPreviousWeek}>
        <ChevronLeftIcon />
      </IconButton>

      <Typography variant="h6" align="center">
        {format(selectedWeekStart, 'd MMMM', { locale: ru })} —{' '}
        {format(addDays(selectedWeekStart, 6), 'd MMMM yyyy', { locale: ru })}
      </Typography>

      <IconButton onClick={goToNextWeek}>
        <ChevronRightIcon />
      </IconButton>
    </Box>
  )
}
