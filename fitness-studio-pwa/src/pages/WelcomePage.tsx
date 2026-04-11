import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import Container from '@mui/material/Container'

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <FitnessCenterIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Фитнес Студия
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Записывайтесь на занятия и следите за расписанием
        </Typography>
      </Box>

      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/register')}
        >
          Зарегистрироваться
        </Button>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => navigate('/login')}
        >
          Войти
        </Button>
      </Box>
    </Container>
  )
}
