import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import GoogleIcon from '@mui/icons-material/Google'
import { loginWithEmail, loginWithGoogle } from '../services/authService'
import { REDIRECT_AFTER_LOGIN_KEY } from '../App'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const getRedirectUrl = () => {
    const saved = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY)
    sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
    return saved || '/'
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true)
      setError(null)
      await loginWithEmail(data.email, data.password)
      navigate(getRedirectUrl())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа. Проверьте данные.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      await loginWithGoogle()
      navigate(getRedirectUrl())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа через Google.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Вход
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Войдите, чтобы записаться на занятия
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <TextField
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }}>или</Divider>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        Войти через Google
      </Button>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          <Link component={RouterLink} to="/recovery" color="primary">
            Забыли пароль?
          </Link>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Нет аккаунта?{' '}
          <Link component={RouterLink} to="/register" color="primary">
            Зарегистрироваться
          </Link>
        </Typography>
      </Box>
    </Container>
  )
}
