#!/bin/bash
# create_issues.sh — создаёт задачи в GitHub для модуля уведомлений

TOKEN="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"
REPO="DmShmakov/Light"
API="https://api.github.com/repos/$REPO/issues"
AUTH="Authorization: token $TOKEN"
ACCEPT="Accept: application/vnd.github.v3+json"
HEADERS="-H \"$AUTH\" -H \"$ACCEPT\""

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  echo "Creating: $title"
  curl -s -X POST "$API" \
    -H "$AUTH" \
    -H "$ACCEPT" \
    -d "{\"title\":\"$title\",\"body\":\"$body\",\"labels\":[$labels]}" \
    | grep -o '"html_url": "[^"]*"' | cut -d'"' -f4
}

# Issue 2
create_issue \
  "2. messagingService.ts — сервис FCM: запрос токена, сохранение, подписка" \
  "## Описание\nСоздать сервис для работы с Firebase Cloud Messaging.\n\n## Что будет реализовано\n- requestNotificationPermission() — запрос разрешения\n- getFCMToken() — получение токена через getToken(messaging, { vapidKey })\n- saveFCMToken(userId, token) — сохранение в fcm_tokens\n- subscribeToTopic(user-{userId})\n- refreshToken() — обновление при смене\n- Обработка ошибок: invalid token, expired, denied\n\n## API\ninterface MessagingService {\n  initialize(userId: string): Promise<void>\n  getToken(): Promise<string | null>\n  revokePermission(): void\n  isSupported(): boolean\n}\n\n## Тесты\n- Unit: mocking Firebase messaging, token сохраняется\n- Unit: обработка denied permission\n- Unit: обработка expired token → очистка\n\n## Критерий приёмки\n✅ Все unit-тесты проходят\n✅ token сохраняется в Firestore при granted\n✅ Тихий выход при denied\n\n## Зависимости\n- Issue #1\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 5.1, 6.1, 11" \
  "\"notification-module\",\"phase-2\",\"client\""

# Issue 3
create_issue \
  "3. useNotifications.ts — хук инициализации FCM и управления разрешениями" \
  "## Описание\nReact-хук для управления уведомлениями в компонентах.\n\n## Что будет реализовано\n- useNotifications() — возвращает состояние, функции\n- checking permission status\n- initialize() — запрос разрешения + получение токена\n- toggle() — вкл/выкл уведомления\n- notificationTypes state — управление типами\n- Persist preferences в Firestore user doc\n\n## API\ninterface UseNotificationsReturn {\n  permission: NotificationPermission | null\n  isSupported: boolean\n  isEnabled: boolean\n  notificationTypes: Record<string, boolean>\n  initialize: () => Promise<void>\n  toggle: () => Promise<void>\n  updateType: (type: string, enabled: boolean) => Promise<void>\n}\n\n## Тесты\n- Unit: hook renders with default state\n- Unit: initialize вызывает messagingService\n- Unit: toggle обновляет user preferences\n- Unit: updateType меняет конкретный тип\n\n## Критерий приёмки\n✅ Все unit-тесты проходят\n✅ Хук корректно отражает состояние\n\n## Зависимости\n- Issue #2\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 5.1, 6.1" \
  "\"notification-module\",\"phase-2\",\"client\""

# Issue 4
create_issue \
  "4. NotificationSnackbar.tsx — компонент UI-уведомлений (Snackbar/Toast)" \
  "## Описание\nУниверсальный Snackbar для мгновенной обратной связи.\n\n## Что будет реализовано\n- Компонент NotificationSnackbar\n- severity: success, error, warning, info\n- auto-hide через 3 сек (настраивается)\n- actions: кнопка действия (опционально)\n- Queue — поддержка нескольких сообщений\n- Интеграция с notistack или собственный на MUI Alert\n\n## API\ninterface NotificationOptions {\n  message: string\n  severity?: 'success' | 'error' | 'warning' | 'info'\n  duration?: number\n  action?: { label: string; onClick: () => void }\n}\n\nfunction enqueueSnackbar(options: NotificationOptions): void\n\n## Тесты\n- Unit: рендер с разными severity\n- Unit: auto-dismiss через duration\n- Unit: action button вызывает onClick\n- Unit: queue — несколько сообщений подряд\n\n## Критерий приёмки\n✅ Все unit-тесты проходят\n✅ Snackbar появляется и исчезает\n✅ Queue работает корректно\n\n## Зависимости\n- Нет (можно параллельно)\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 5.4, 6.1" \
  "\"notification-module\",\"phase-2\",\"client\",\"ui\""

# Issue 5
create_issue \
  "5. Service Worker: обработка push-уведомлений (firebase-messaging-sw.js)" \
  "## Описание\nService Worker для получения и обработки push-уведомлений.\n\n## Что будет реализовано\n- firebase-messaging-sw.js — фоновый обработчик\n- push event handler — парсинг payload\n- self.registration.showNotification() — отображение\n- notificationclick handler — deep links:\n  - action 'view' → /class/{classId}\n  - action 'cancel' → /class/{classId}\n  - default → /\n- notificationclose handler\n- Настройка vite-plugin-pwa → injectManifest\n\n## Payload формат\n{\n  title: string\n  body: string\n  data: { type, classId, ... }\n  actions: [{ action, title }]\n  icon: string\n  tag: string\n}\n\n## Тесты\n- Unit: парсинг push payload\n- Unit: notificationclick → правильный URL\n- Integration: workbox-window регистрация\n\n## Критерий приёмки\n✅ Все тесты проходят\n✅ Push принимается и отображается\n✅ Клик открывает нужную страницу\n\n## Зависимости\n- Issue #2\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 5.3, 6.1" \
  "\"notification-module\",\"phase-2\",\"service-worker\""

# Issue 6
create_issue \
  "6. NotificationSettingsPage — экран настроек типов уведомлений" \
  "## Описание\nЭкран в профиле для управления типами уведомлений.\n\n## Что будет реализовано\n- Toggle switches для каждого типа:\n  - Подтверждение записи\n  - Напоминание о занятии\n  - Изменение расписания\n  - Отмена занятия\n  - Освобождение места\n  - Административные\n- Глобальный toggle Вкл/Выкл все\n- Сохранение в user.preferences.notificationTypes\n- Индикатор статуса разрешений браузера\n- Ссылка на инструкцию при denied permission\n\n## Тесты\n- E2E: toggle вкл/выкл, проверка сохранения\n- E2E: глобальный toggle выключает все\n- Unit: компонент рендерится с настройками из store\n\n## Критерий приёмки\n✅ Все тесты проходят\n- Настройки сохраняются в Firestore\n- UI отражает актуальное состояние\n\n## Зависимости\n- Issue #2\n- Issue #4\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 4.2, 6.1" \
  "\"notification-module\",\"phase-2\",\"client\",\"ui\""

# Issue 7
create_issue \
  "7. Cloud Functions: notificationService + tokenService" \
  "## Описание\nБазовые сервисы Cloud Functions для отправки уведомлений.\n\n## Что будет реализовано\n\n### tokenService.ts\n- saveToken(userId, token, platform)\n- invalidateToken(token)\n- cleanupExpiredTokens() — scheduled\n- getUserTokens(userId) — получить все активные токены\n\n### notificationService.ts\n- sendNotification(userId, payload) — отправка через admin.messaging().sendEach()\n- sendToTopic(topic, payload)\n- handleFCMError(error, token) — обработка ошибок\n- Templates: enrollment_confirmed, class_reminder, class_changed, class_cancelled\n\n## Тесты\n- Unit: sendNotification вызывает sendEach\n- Unit: handleFCMError → invalidate token при expired\n- Unit: template генерация для каждого типа\n- Integration: mock admin.messaging()\n\n## Критерий приёмки\n✅ Все тесты проходят\n✅ Tokens сохраняются и инвалидируются\n✅ Уведомления отправляются через mock\n\n## Зависимости\n- Issue #1\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 3.2, 5.2, 6.2, 11.3" \
  "\"notification-module\",\"phase-2\",\"cloud-functions\""

# Issue 8
create_issue \
  "8. Cloud Functions: enrollmentTriggers + classTriggers" \
  "## Описание\nDatabase triggers для автоматической отправки уведомлений.\n\n## Что будет реализовано\n\n### enrollmentTriggers.ts\n- onWrite(enrollments/{id}):\n  - Создание → push 'Запись подтверждена'\n  - Удаление → push 'Место освободилось' (лист ожидания)\n  - Проверка user.preferences перед отправкой\n\n### classTriggers.ts\n- onWrite(classes/{id}):\n  - Изменение времени → push 'Изменение расписания'\n  - status → cancelled → push 'Занятие отменено'\n  - status → scheduled → push 'Занятие восстановлено'\n  - Получение списка записанных → отправка каждому\n\n## Тесты\n- Unit: trigger при создании enrollment\n- Unit: trigger при отмене занятия\n- Unit: отправка только пользователям с включённым типом\n- Integration: mock Firestore + mock messaging\n\n## Критерий приёмки\n✅ Все тесты проходят\n✅ Триггеры срабатывают на изменения\n✅ Учитываются preferences пользователей\n\n## Зависимости\n- Issue #7\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 3.1, 5.2, 6.2" \
  "\"notification-module\",\"phase-2\",\"cloud-functions\""

# Issue 9
create_issue \
  "9. Cloud Functions: reminders.ts — cron напоминания за 2 часа" \
  "## Описание\nScheduled function для отправки напоминаний.\n\n## Что будет реализовано\n- PubSub scheduled function (каждые 15 минут)\n- Query: занятия через 2 часа ± 15 мин\n- Для каждого занятия:\n  - Получить записанных участников\n  - Проверить preferences\n  - Отправить напоминание\n- Дедупликация: флаг reminderSent в классе\n- Логирование: сколько отправлено\n\n## Расписание\nschedule: 'every 15 minutes'\ntimezone: 'Europe/Moscow'\n\n## Тесты\n- Unit: query находит занятия в окне 2ч\n- Unit: отправка только записанным с включённым reminder\n- Unit: дедупликация (reminderSent = true)\n- Integration: mock scheduler + messaging\n\n## Критерий приёмки\n✅ Все тесты проходят\n✅ Напоминания отправляются за 2 часа\n✅ Нет дубликатов\n\n## Зависимости\n- Issue #7\n\n## Ссылки\n- NOTIFICATION_MODULE.md разделы 3.1, 3.2.2, 6.2" \
  "\"notification-module\",\"phase-2\",\"cloud-functions\""

# Issue 10
create_issue \
  "10. Firebase Hosting: деплой PWA и Cloud Functions" \
  "## Описание\nНастроить деплой на Firebase Hosting и Functions.\n\n## Что будет реализовано\n- firebase init hosting (если не сделано)\n- firebase init functions\n- Настройка public directory → dist/\n- Настройка rewrites для SPA (/* → /index.html)\n- GitHub Actions CI/CD:\n  - Build на push в main\n  - Deploy на Firebase Hosting\n  - Deploy Functions при изменении functions/\n- firebase.json конфигурация\n\n## CI/CD Pipeline\n1. npm install\n2. npm run build\n3. npm run test:e2e\n4. firebase deploy --only hosting,functions\n\n## Тесты\n- E2E: приложение доступно после деплоя\n- E2E: Service Worker зарегистрирован\n\n## Критерий приёмки\n✅ CI/CD pipeline проходит\n✅ PWA доступно по https URL\n✅ Functions работают в production\n\n## Зависимости\n- Все предыдущие issues\n\n## Ссылки\n- NOTIFICATION_MODULE.md раздел 6" \
  "\"notification-module\",\"phase-2\",\"devops\""

# Issue 11
create_issue \
  "11. E2E тесты модуля уведомлений" \
  "## Описание\nEnd-to-end тесты для всего цикла уведомлений.\n\n## Что будет реализовано\n- E2E: пользователь включает уведомления → токен сохраняется\n- E2E: запись на занятие → появляется Snackbar 'Запись подтверждена'\n- E2E: отмена записи → Snackbar 'Запись отменена'\n- E2E: настройка типов уведомлений в профиле\n- E2E: Service Worker регистрация\n- Mock push-уведомлений для тестирования\n\n## Платформы для тестирования\n- Chrome Desktop\n- Chrome Android\n- iOS Safari (если возможно)\n\n## Тесты\n- Playwright: все сценарии выше\n- CI: запуск в headless Chrome\n\n## Критерий приёмки\n✅ 100% E2E тестов проходят\n✅ CI pipeline зелёный\n\n## Зависимости\n- Issue #4 (Snackbar)\n- Issue #6 (Settings)\n\n## Ссылки\n- NOTIFICATION_MODULE.md раздел 10.5" \
  "\"notification-module\",\"phase-2\",\"testing\""

echo "Done!"
