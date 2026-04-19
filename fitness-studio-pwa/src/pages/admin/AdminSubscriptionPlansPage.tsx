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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Skeleton from '@mui/material/Skeleton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { getAllSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan } from '../../services/subscriptionService'
import { SubscriptionPlan } from '../../types'
import { notify } from '../../components/NotificationSnackbar'

interface PlanForm {
  name: string
  description: string
  unlimited: boolean       // визиты безлимит
  visitsCount: string
  noExpiry: boolean        // без ограничения срока
  durationDays: string
  isActive: boolean
}

const emptyForm = (): PlanForm => ({
  name: '',
  description: '',
  unlimited: false,
  visitsCount: '',
  noExpiry: false,
  durationDays: '',
  isActive: true,
})

export default function AdminSubscriptionPlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setPlans(await getAllSubscriptionPlans())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingPlan(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description,
      unlimited: plan.visitsCount === null,
      visitsCount: plan.visitsCount?.toString() || '',
      noExpiry: plan.durationDays === null,
      durationDays: plan.durationDays?.toString() || '',
      isActive: plan.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      notify({ message: 'Введите название', severity: 'error', duration: 3000 })
      return
    }

    setSaving(true)
    try {
      const data: Omit<SubscriptionPlan, 'planId' | 'createdAt'> = {
        name: form.name.trim(),
        description: form.description.trim(),
        visitsCount: form.unlimited ? null : (parseInt(form.visitsCount) || null),
        durationDays: form.noExpiry ? null : (parseInt(form.durationDays) || null),
        isActive: form.isActive,
      }

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.planId, data)
        notify({ message: 'Тип абонемента обновлён', severity: 'success', duration: 3000 })
      } else {
        await createSubscriptionPlan(data)
        notify({ message: 'Тип абонемента создан', severity: 'success', duration: 3000 })
      }

      setDialogOpen(false)
      await load()
    } catch {
      notify({ message: 'Ошибка сохранения', severity: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const set = (patch: Partial<PlanForm>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          Типы абонементов
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Добавить
        </Button>
      </Box>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />
        ))
      ) : plans.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Нет типов абонементов
        </Typography>
      ) : (
        plans.map((plan) => (
          <Card key={plan.planId} sx={{ mb: 1 }} variant="outlined">
            <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {plan.name}
                  </Typography>
                  {!plan.isActive && <Chip label="Скрыт" size="small" color="default" />}
                </Box>
                {plan.description && (
                  <Typography variant="body2" color="text.secondary">
                    {plan.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={plan.visitsCount ? `${plan.visitsCount} занятий` : 'Безлимит'}
                    size="small"
                    variant="outlined"
                    color={plan.visitsCount ? 'default' : 'success'}
                  />
                  <Chip
                    label={plan.durationDays ? `${plan.durationDays} дней` : 'Бессрочный'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>
              <IconButton size="small" onClick={() => openEdit(plan)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))
      )}

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingPlan ? 'Редактировать тип' : 'Новый тип абонемента'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Название *"
            fullWidth
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />

          <Box>
            <FormControlLabel
              control={<Switch checked={form.unlimited} onChange={(e) => set({ unlimited: e.target.checked })} />}
              label="Безлимитный по визитам"
            />
            {!form.unlimited && (
              <TextField
                label="Количество занятий"
                type="number"
                fullWidth
                value={form.visitsCount}
                onChange={(e) => set({ visitsCount: e.target.value })}
                InputProps={{ inputProps: { min: 1 } }}
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          <Box>
            <FormControlLabel
              control={<Switch checked={form.noExpiry} onChange={(e) => set({ noExpiry: e.target.checked })} />}
              label="Без ограничения срока"
            />
            {!form.noExpiry && (
              <TextField
                label="Срок действия (дней)"
                type="number"
                fullWidth
                value={form.durationDays}
                onChange={(e) => set({ durationDays: e.target.value })}
                InputProps={{ inputProps: { min: 1 } }}
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {editingPlan && (
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />}
              label="Показывать пользователям"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
