import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import {
  getActiveSubscriptionPlans,
  getCurrentUserSubscription,
  createUserSubscription,
} from '../services/subscriptionService'
import { SubscriptionPlan, UserSubscription, SubscriptionStatus } from '../types'
import { notify } from '../components/NotificationSnackbar'

const statusLabels: Record<SubscriptionStatus, string> = {
  unpaid:    'Не оплачен',
  active:    'Активен',
  expired:   'Истёк',
  exhausted: 'Исчерпан',
}

const statusColors: Record<SubscriptionStatus, 'warning' | 'success' | 'error' | 'default'> = {
  unpaid:    'warning',
  active:    'success',
  expired:   'error',
  exhausted: 'default',
}

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [subscription, setSubscription] = useState<UserSubscription | null | undefined>(undefined)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  // Диалог выбора даты начала
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [startDateStr, setStartDateStr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const [sub, availablePlans] = await Promise.all([
          getCurrentUserSubscription(user.uid),
          getActiveSubscriptionPlans(),
        ])
        setSubscription(sub)
        setPlans(availablePlans)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const canChoosePlan =
    !subscription || subscription.status === 'expired' || subscription.status === 'exhausted'

  const computedExpiry = (startDateStr && selectedPlan?.durationDays)
    ? (() => {
        const d = new Date(startDateStr)
        d.setDate(d.getDate() + selectedPlan.durationDays!)
        return format(d, 'd MMMM yyyy', { locale: ru })
      })()
    : null

  const handleChoosePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setStartDateStr(today)
  }

  const handleConfirm = async () => {
    if (!user || !selectedPlan || !startDateStr) return
    setSubmitting(true)
    try {
      await createUserSubscription(
        user.uid,
        user.name,
        user.email || '',
        selectedPlan,
        new Date(startDateStr)
      )
      const updated = await getCurrentUserSubscription(user.uid)
      setSubscription(updated)
      setSelectedPlan(null)
      notify({ message: 'Абонемент добавлен. Ожидайте подтверждения оплаты.', severity: 'success', duration: 4000 })
    } catch (err: unknown) {
      notify({ message: err instanceof Error ? err.message : 'Ошибка', severity: 'error', duration: 4000 })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={80} />
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Абонемент
        </Typography>
      </Box>

      {/* Текущий абонемент */}
      {subscription && (
        <Card sx={{ mb: 3 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="h6">{subscription.planName}</Typography>
              <Chip
                label={statusLabels[subscription.status]}
                size="small"
                color={statusColors[subscription.status]}
              />
            </Box>

            {subscription.status === 'unpaid' && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                Ожидает подтверждения оплаты администратором
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {subscription.startDate && (
                <Typography variant="body2" color="text.secondary">
                  Начало: {format(subscription.startDate, 'd MMMM yyyy', { locale: ru })}
                </Typography>
              )}
              {subscription.expiresAt && (
                <Typography variant="body2" color="text.secondary">
                  Действует до: {format(subscription.expiresAt, 'd MMMM yyyy', { locale: ru })}
                </Typography>
              )}
            </Box>

            {subscription.visitsTotal !== null ? (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Визиты</Typography>
                  <Typography variant="body2">
                    {subscription.visitsUsed} / {subscription.visitsTotal} использовано
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(subscription.visitsUsed / subscription.visitsTotal) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }} display="block">
                  Осталось: {Math.max(0, subscription.visitsTotal - subscription.visitsUsed)} занятий
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography variant="body2" color="success.main">
                  Безлимитный
                </Typography>
              </Box>
            )}

            {subscription.enrolledClassIds.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Занятий по абонементу: {subscription.enrolledClassIds.length}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Выбор нового абонемента */}
      {canChoosePlan && (
        <>
          {!subscription && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Для записи на занятия необходим активный абонемент
            </Alert>
          )}
          {(subscription?.status === 'exhausted' || subscription?.status === 'expired') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Ваш абонемент недействителен. Выберите новый.
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Выбрать абонемент
          </Typography>

          {plans.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Нет доступных абонементов
            </Typography>
          ) : (
            plans.map((plan) => (
              <Card key={plan.planId} sx={{ mb: 1.5 }} variant="outlined">
                <CardActionArea onClick={() => handleChoosePlan(plan)}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {plan.name}
                        </Typography>
                        {plan.description && (
                          <Typography variant="body2" color="text.secondary">
                            {plan.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                        <Chip
                          label={plan.visitsCount ? `${plan.visitsCount} занятий` : 'Безлимит'}
                          size="small"
                          color={plan.visitsCount ? 'default' : 'success'}
                          variant="outlined"
                        />
                        {plan.durationDays && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {plan.durationDays} дней
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          )}
        </>
      )}

      {/* Диалог выбора даты начала */}
      <Dialog open={!!selectedPlan} onClose={() => setSelectedPlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Дата начала абонемента</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedPlan?.name}
            {selectedPlan?.visitsCount ? ` · ${selectedPlan.visitsCount} занятий` : ' · Безлимит'}
          </Typography>

          <TextField
            label="Дата начала"
            type="date"
            fullWidth
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {computedExpiry && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }} display="block">
              Действует до: {computedExpiry}
            </Typography>
          )}
          {selectedPlan && !selectedPlan.durationDays && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }} display="block">
              Без ограничения срока
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPlan(null)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!startDateStr || submitting}
          >
            {submitting ? 'Сохранение...' : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
