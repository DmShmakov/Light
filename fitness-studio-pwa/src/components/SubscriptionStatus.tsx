import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { getCurrentUserSubscription } from '../services/subscriptionService'
import { UserSubscription, type SubscriptionStatus } from '../types'

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

export default function SubscriptionStatus() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [subscription, setSubscription] = useState<UserSubscription | null | undefined>(undefined)

  useEffect(() => {
    if (!user) { setSubscription(null); return }
    getCurrentUserSubscription(user.uid).then(setSubscription)
  }, [user])

  if (subscription === undefined) {
    return <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
  }

  return (
    <Card sx={{ mb: 2 }} variant="outlined">
      <CardActionArea onClick={() => navigate('/subscription')}>
        <CardContent sx={{ py: 1.5 }}>
          {subscription ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {subscription.planName}
                </Typography>
                <Chip
                  label={statusLabels[subscription.status]}
                  size="small"
                  color={statusColors[subscription.status]}
                />
              </Box>

              {subscription.visitsTotal !== null ? (
                <Box sx={{ mb: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Визиты
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subscription.visitsUsed} / {subscription.visitsTotal}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(subscription.visitsUsed / subscription.visitsTotal) * 100}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Безлимитный
                </Typography>
              )}

              {subscription.expiresAt && (
                <Typography variant="caption" color="text.secondary" display="block">
                  До {format(subscription.expiresAt, 'd MMMM yyyy', { locale: ru })}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Нет активного абонемента
              </Typography>
              <Typography variant="caption" color="primary">
                Выбрать →
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
