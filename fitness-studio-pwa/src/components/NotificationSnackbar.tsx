import { useState, useCallback, useRef } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info'

interface ActiveNotification {
  message: string
  severity: SnackbarSeverity
  action?: { label: string; onClick: () => void }
}

interface NotificationQueue {
  message: string
  severity: SnackbarSeverity
  duration?: number
  action?: { label: string; onClick: () => void }
}

let globalEnqueue: ((n: NotificationQueue) => void) | null = null

/**
 * Глобальная функция для вызова Snackbar (без хука)
 */
export function notify(options: NotificationQueue) {
  globalEnqueue?.(options)
}

/**
 * Компонент управления уведомлениями
 * Монтируется один раз в App
 */
export function NotificationHandler() {
  const [current, setCurrent] = useState<ActiveNotification | null>(null)
  const queueRef = useRef<NotificationQueue[]>([])
  const isOpenRef = useRef(false)

  const processQueue = useCallback(() => {
    if (isOpenRef.current || queueRef.current.length === 0) return

    const next = queueRef.current.shift()
    if (next) {
      setCurrent({
        message: next.message,
        severity: next.severity,
        action: next.action,
      })
      isOpenRef.current = true
    }
  }, [])

  const enqueue = useCallback((n: NotificationQueue) => {
    queueRef.current.push(n)
    processQueue()
  }, [processQueue])

  // Экспортируем функцию для глобального доступа
  globalEnqueue = enqueue

  const handleClose = useCallback(() => {
    isOpenRef.current = false
    setCurrent(null)
    // Обработка очереди после закрытия
    setTimeout(processQueue, 100)
  }, [processQueue])

  return (
    <Snackbar
      open={!!current}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={current?.severity} variant="filled" sx={{ width: '100%' }}>
        {current?.message}
      </Alert>
    </Snackbar>
  )
}
