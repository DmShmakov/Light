import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import ClearIcon from '@mui/icons-material/Clear'
import { useState } from 'react'
import { ScheduleFilterState, EMPTY_FILTERS, hasActiveFilters } from '../utils/scheduleFilters'

interface Props {
  filters: ScheduleFilterState
  onChange: (filters: ScheduleFilterState) => void
  availableTypes: string[]
}

const typeLabels: Record<string, string> = {
  yoga:     'Йога',
  pilates:  'Пилатес',
  crossfit: 'Кроссфит',
  stretch:  'Стретчинг',
  dance:    'Танцы',
  boxing:   'Бокс',
}

const levelLabels: Record<string, string> = {
  beginner:     'Начальный',
  intermediate: 'Средний',
  advanced:     'Продвинутый',
}

const levelColors: Record<string, 'success' | 'error' | 'primary'> = {
  beginner:     'success',
  intermediate: 'error',
  advanced:     'primary',
}

const timeLabels: Record<string, string> = {
  morning:   'Утро 6–12',
  afternoon: 'День 12–17',
  evening:   'Вечер 17–23',
}

export default function ScheduleFilters({ filters, onChange, availableTypes }: Props) {
  const [expanded, setExpanded] = useState(false)
  const active = hasActiveFilters(filters)

  const set = (patch: Partial<ScheduleFilterState>) =>
    onChange({ ...filters, ...patch })

  return (
    <Box sx={{ mb: 2 }}>
      {/* Строка поиска + кнопка фильтров */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Поиск по названию или тренеру"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: filters.search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => set({ search: '' })}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <IconButton
          onClick={() => setExpanded((v) => !v)}
          color={active && !filters.search ? 'primary' : 'default'}
          sx={{ flexShrink: 0 }}
          aria-label="фильтры"
        >
          <TuneIcon />
        </IconButton>
      </Box>

      {/* Расширенные фильтры */}
      <Collapse in={expanded}>
        <Box sx={{ pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Тип занятия */}
          {availableTypes.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Тип занятия</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {availableTypes.map((t) => (
                  <Chip
                    key={t}
                    label={typeLabels[t] ?? t}
                    size="small"
                    clickable
                    color={filters.type === t ? 'primary' : 'default'}
                    variant={filters.type === t ? 'filled' : 'outlined'}
                    onClick={() => set({ type: filters.type === t ? '' : t })}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Уровень */}
          <Box>
            <Typography variant="caption" color="text.secondary">Уровень</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {Object.entries(levelLabels).map(([val, label]) => (
                <Chip
                  key={val}
                  label={label}
                  size="small"
                  clickable
                  color={levelColors[val] ?? 'default'}
                  variant={filters.level === val ? 'filled' : 'outlined'}
                  onClick={() => set({ level: filters.level === val ? '' : val })}
                />
              ))}
            </Box>
          </Box>

          {/* Время суток */}
          <Box>
            <Typography variant="caption" color="text.secondary">Время</Typography>
            <Box sx={{ mt: 0.5 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filters.timeOfDay}
                onChange={(_, v) => set({ timeOfDay: v ?? '' })}
              >
                {Object.entries(timeLabels).map(([val, label]) => (
                  <ToggleButton key={val} value={val}>{label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Сброс */}
          {active && (
            <Box>
              <Chip
                label="Сбросить фильтры"
                size="small"
                onDelete={() => onChange(EMPTY_FILTERS)}
                onClick={() => onChange(EMPTY_FILTERS)}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
