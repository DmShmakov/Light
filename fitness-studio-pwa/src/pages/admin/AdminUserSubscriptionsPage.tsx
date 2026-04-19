import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import {
  getAllSubscriptions,
  getAllSubscriptionPlans,
  createUserSubscription,
  setSubscriptionPaid,
  changeSubscriptionPlan,
  extendSubscription,
} from '../../services/subscriptionService'
import { UserSubscription, SubscriptionPlan, SubscriptionStatus, User } from '../../types'
import { notify } from '../../components/NotificationSnackbar'

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

type DialogMode = 'add' | 'changePlan' | 'extend'

export default function AdminUserSubscriptionsPage() {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [targetSub, setTargetSub] = useState<UserSubscription | null>(null)
  const [saving, setSaving] = useState(false)

  // Поля формы
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [startDateStr, setStartDateStr] = useState('')
  const [extendDays, setExtendDays] = useState('30')

  const today = format(new Date(), 'yyyy-MM-dd')

  const load = async () => {
    setLoading(true)
    try {
      const [subs, allPlans, usersSnap] = await Promise.all([
        getAllSubscriptions(),
        getAllSubscriptionPlans(),
        getDocs(collection(db, 'users')),
      ])
      setSubscriptions(subs)
      setPlans(allPlans)
      setUsers(
        usersSnap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })) as User[]
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setSelectedUserId('')
    setUserSearch('')
    setSelectedPlanId('')
    setStartDateStr(today)
    setDialogMode('add')
  }

  const openChangePlan = (sub: UserSubscription) => {
    setTargetSub(sub)
    setSelectedPlanId(sub.planId)
    setDialogMode('changePlan')
  }

  const openExtend = (sub: UserSubscription) => {
    setTargetSub(sub)
    setExtendDays('30')
    setDialogMode('extend')
  }

  const handleMarkPaid = async (sub: UserSubscription) => {
    try {
      await setSubscriptionPaid(sub.subscriptionId)
      notify({ message: `Абонемент ${sub.userName} отмечен как оплаченный`, severity: 'success', duration: 3000 })
      await load()
    } catch {
      notify({ message: 'Ошибка', severity: 'error', duration: 3000 })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (dialogMode === 'add') {
        const user = users.find((u) => u.uid === selectedUserId)
        const plan = plans.find((p) => p.planId === selectedPlanId)
        if (!user || !plan || !startDateStr) {
          notify({ message: 'Заполните все поля', severity: 'error', duration: 3000 })
          return
        }
        await createUserSubscription(
          user.uid, user.name, user.email || '', plan, new Date(startDateStr)
        )
        notify({ message: 'Абонемент добавлен', severity: 'success', duration: 3000 })
      }

      if (dialogMode === 'changePlan' && targetSub) {
        const plan = plans.find((p) => p.planId === selectedPlanId)
        if (!plan) return
        await changeSubscriptionPlan(targetSub.subscriptionId, plan)
        notify({ message: 'Тип абонемента изменён', severity: 'success', duration: 3000 })
      }

      if (dialogMode === 'extend' && targetSub) {
        const days = parseInt(extendDays)
        if (!days || days < 1) {
          notify({ message: 'Введите количество дней', severity: 'error', duration: 3000 })
          return
        }
        await extendSubscription(targetSub.subscriptionId, days)
        notify({ message: `Срок продлён на ${days} дней`, severity: 'success', duration: 3000 })
      }

      setDialogMode(null)
      await load()
    } catch (err: unknown) {
      notify({ message: err instanceof Error ? err.message : 'Ошибка', severity: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const selectedPlanObj = plans.find((p) => p.planId === selectedPlanId)
  const computedExpiry = (startDateStr && selectedPlanObj?.durationDays)
    ? (() => {
        const d = new Date(startDateStr)
        d.setDate(d.getDate() + selectedPlanObj.durationDays!)
        return format(d, 'd MMMM yyyy', { locale: ru })
      })()
    : null

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          Управление абонементами
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small">
          Добавить
        </Button>
      </Box>

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 1 }} />
        ))
      ) : subscriptions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Нет абонементов
        </Typography>
      ) : (
        subscriptions.map((sub) => (
          <Card key={sub.subscriptionId} sx={{ mb: 1 }} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {sub.userName || sub.userEmail}
                  </Typography>
                  {sub.userName && sub.userEmail && (
                    <Typography variant="caption" color="text.secondary">
                      {sub.userEmail}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={statusLabels[sub.status]}
                  size="small"
                  color={statusColors[sub.status]}
                />
              </Box>

              <Typography variant="body2">{sub.planName}</Typography>

              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {sub.startDate && (
                  <Typography variant="caption" color="text.secondary">
                    С {format(sub.startDate, 'd MMM yyyy', { locale: ru })}
                  </Typography>
                )}
                {sub.expiresAt && (
                  <Typography variant="caption" color="text.secondary">
                    · по {format(sub.expiresAt, 'd MMM yyyy', { locale: ru })}
                  </Typography>
                )}
              </Box>

              {sub.visitsTotal !== null && (
                <Box sx={{ mt: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(sub.visitsUsed / sub.visitsTotal) * 100}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {sub.visitsUsed} / {sub.visitsTotal} визитов
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {sub.status === 'unpaid' && (
                  <Button size="small" variant="contained" color="success" onClick={() => handleMarkPaid(sub)}>
                    Отметить оплаченным
                  </Button>
                )}
                <Button size="small" variant="outlined" onClick={() => openChangePlan(sub)}>
                  Сменить план
                </Button>
                {sub.durationDays && (
                  <Button size="small" variant="outlined" onClick={() => openExtend(sub)}>
                    Продлить
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* Диалоги */}
      <Dialog open={!!dialogMode} onClose={() => setDialogMode(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' && 'Добавить абонемент'}
          {dialogMode === 'changePlan' && 'Сменить тип абонемента'}
          {dialogMode === 'extend' && 'Продлить абонемент'}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {dialogMode === 'add' && (
            <>
              <TextField
                label="Поиск пользователя"
                fullWidth
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setSelectedUserId('') }}
                placeholder="Имя или email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Пользователь"
                fullWidth
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled>
                  {userSearch
                    ? users.filter((u) =>
                        `${u.name} ${u.email ?? ''}`.toLowerCase().includes(userSearch.toLowerCase())
                      ).length === 0
                      ? 'Ничего не найдено'
                      : 'Выберите из списка'
                    : 'Начните вводить имя для поиска'}
                </MenuItem>
                {users
                  .filter((u) =>
                    !userSearch ||
                    `${u.name} ${u.email ?? ''}`.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => (
                    <MenuItem key={u.uid} value={u.uid}>
                      {u.name} {u.email ? `(${u.email})` : ''}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                select
                label="Тип абонемента"
                fullWidth
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <MenuItem key={p.planId} value={p.planId}>
                    {p.name}
                    {p.visitsCount ? ` · ${p.visitsCount} занятий` : ' · безлимит'}
                    {p.durationDays ? ` · ${p.durationDays} дн.` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Дата начала"
                type="date"
                fullWidth
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              {computedExpiry && (
                <Typography variant="caption" color="text.secondary">
                  Действует до: {computedExpiry}
                </Typography>
              )}
            </>
          )}

          {dialogMode === 'changePlan' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Пользователь: {targetSub?.userName}
              </Typography>
              <TextField
                select
                label="Новый тип абонемента"
                fullWidth
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <MenuItem key={p.planId} value={p.planId}>
                    {p.name}
                    {p.visitsCount ? ` · ${p.visitsCount} занятий` : ' · безлимит'}
                    {p.durationDays ? ` · ${p.durationDays} дн.` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                Количество использованных визитов ({targetSub?.visitsUsed}) сохранится
              </Typography>
            </>
          )}

          {dialogMode === 'extend' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Текущий срок:{' '}
                {targetSub?.expiresAt
                  ? format(targetSub.expiresAt, 'd MMMM yyyy', { locale: ru })
                  : 'не задан'}
              </Typography>
              <TextField
                label="Продлить на дней"
                type="number"
                fullWidth
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                InputProps={{ inputProps: { min: 1 } }}
              />
              {extendDays && targetSub?.expiresAt && (
                <Typography variant="caption" color="text.secondary">
                  Новый срок:{' '}
                  {format(
                    new Date(targetSub.expiresAt.getTime() + parseInt(extendDays) * 86400000),
                    'd MMMM yyyy',
                    { locale: ru }
                  )}
                </Typography>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogMode(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
