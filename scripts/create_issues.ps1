$h=@{'Authorization'='token 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'; 'Accept'='application/vnd.github.v3+json'}
$url='https://api.github.com/repos/DmShmakov/Light/issues'

function Create-Issue($title, $body, $labels) {
    $b=@{title=$title; body=$body; labels=$labels}
    $r=Invoke-RestMethod -Uri $url -Method POST -Headers $h -Body ($b | ConvertTo-Json -Depth 10) -ContentType 'application/json'
    Write-Host "Created: $($r.html_url)"
}

# 4. NotificationSnackbar
Create-Issue "4. NotificationSnackbar.tsx — компонент UI-уведомлений" @"
## Описание
Универсальный Snackbar для мгновенной обратной связи.

## Что будет реализовано
- Компонент NotificationSnackbar
- severity: success, error, warning, info
- auto-hide через 3 сек
- actions: кнопка действия
- Queue — несколько сообщений
- notistack или MUI Alert

## Тесты
- Unit: рендер с разными severity
- Unit: auto-dismiss
- Unit: action button onClick
- Unit: queue

## Критерий приёмки
✅ Все unit-тесты проходят

## Ссылки: NOTIFICATION_MODULE.md 5.4, 6.1
"@ @('notification-module','phase-2','client','ui')

# 5. Service Worker
Create-Issue "5. Service Worker: обработка push (firebase-messaging-sw.js)" @"
## Описание
Service Worker для получения и обработки push-уведомлений.

## Что будет реализовано
- firebase-messaging-sw.js
- push event handler
- notificationclick → deep links (/class/{classId}, /)
- vite-plugin-pwa → injectManifest

## Тесты
- Unit: парсинг push payload
- Unit: notificationclick → URL
- Integration: workbox-window

## Критерий приёмки
✅ Все тесты проходят
✅ Push принимается и отображается

## Зависимости: Issue #2

## Ссылки: NOTIFICATION_MODULE.md 5.3, 6.1
"@ @('notification-module','phase-2','service-worker')

# 6. NotificationSettingsPage
Create-Issue "6. NotificationSettingsPage — экран настроек типов уведомлений" @"
## Описание
Экран в профиле для управления типами уведомлений.

## Что будет реализовано
- Toggle switches для каждого типа
- Глобальный toggle Вкл/Выкл все
- Сохранение в user.preferences.notificationTypes
- Индикатор статуса разрешений

## Тесты
- E2E: toggle вкл/выкл → Firestore
- E2E: глобальный toggle
- Unit: render с настройками

## Критерий приёмки
✅ Все тесты проходят
✅ Настройки сохраняются

## Зависимости: Issue #2, #4

## Ссылки: NOTIFICATION_MODULE.md 4.2, 6.1
"@ @('notification-module','phase-2','client','ui')

# 7. Cloud Functions: notificationService + tokenService
Create-Issue "7. Cloud Functions: notificationService + tokenService" @"
## Описание
Базовые сервисы Cloud Functions для отправки уведомлений.

## Что будет реализовано
### tokenService.ts
- saveToken, invalidateToken, cleanupExpiredTokens, getUserTokens

### notificationService.ts
- sendNotification(userId, payload)
- sendToTopic
- handleFCMError
- Templates для всех типов

## Тесты
- Unit: sendEach вызов
- Unit: handleFCMError → invalidate
- Unit: template генерация

## Критерий приёмки
✅ Все тесты проходят

## Зависимости: Issue #1

## Ссылки: NOTIFICATION_MODULE.md 3.2, 5.2, 6.2
"@ @('notification-module','phase-2','cloud-functions')

# 8. enrollmentTriggers + classTriggers
Create-Issue "8. Cloud Functions: enrollmentTriggers + classTriggers" @"
## Описание
Database triggers для автоматической отправки уведомлений.

## Что будет реализовано
### enrollmentTriggers.ts
- onWrite(enrollments) → push подтверждения

### classTriggers.ts
- onWrite(classes) → push об изменениях/отменах
- Отправка всем записанным

## Тесты
- Unit: trigger при создании enrollment
- Unit: trigger при отмене
- Unit: проверка preferences

## Критерий приёмки
✅ Все тесты проходят

## Зависимости: Issue #7

## Ссылки: NOTIFICATION_MODULE.md 3.1, 5.2, 6.2
"@ @('notification-module','phase-2','cloud-functions')

# 9. reminders.ts cron
Create-Issue "9. Cloud Functions: reminders.ts — cron напоминания за 2 часа" @"
## Описание
Scheduled function для отправки напоминаний.

## Что будет реализовано
- PubSub scheduled (каждые 15 мин)
- Query занятий через 2 часа
- Отправка записанным
- Дедупликация: reminderSent

## Тесты
- Unit: query находит занятия в окне
- Unit: отправка с проверкой preferences
- Unit: дедупликация

## Критерий приёмки
✅ Все тесты проходят
✅ Напоминания за 2 часа, без дубликатов

## Зависимости: Issue #7

## Ссылки: NOTIFICATION_MODULE.md 3.1, 3.2.2, 6.2
"@ @('notification-module','phase-2','cloud-functions')

# 10. Firebase Hosting + CI/CD
Create-Issue "10. Firebase Hosting: деплой PWA и Cloud Functions" @"
## Описание
Настроить деплой и CI/CD.

## Что будет реализовано
- firebase init hosting + functions
- GitHub Actions CI/CD
- Build → test → deploy pipeline

## Тесты
- E2E: приложение доступно
- E2E: SW зарегистрирован

## Критерий приёмки
✅ CI/CD pipeline проходит
✅ PWA доступно по https

## Зависимости: все предыдущие

## Ссылки: NOTIFICATION_MODULE.md 6
"@ @('notification-module','phase-2','devops')

# 11. E2E тесты
Create-Issue "11. E2E тесты модуля уведомлений" @"
## Описание
End-to-end тесты для всего цикла уведомлений.

## Что будет реализовано
- E2E: включение уведомнений → token
- E2E: запись → Snackbar
- E2E: отмена → Snackbar
- E2E: настройки типов
- E2E: Service Worker регистрация

## Тесты
- Playwright: все сценарии
- CI: headless Chrome

## Критерий приёмки
✅ 100% E2E тестов проходят

## Зависимости: Issue #4, #6

## Ссылки: NOTIFICATION_MODULE.md 10.5
"@ @('notification-module','phase-2','testing')

Write-Host "`nAll issues created!"
