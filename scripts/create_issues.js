const https = require('https');

const TOKEN = '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';
const REPO = 'DmShmakov/Light';

const issues = [
  {
    title: '1. Инфраструктура FCM: VAPID-ключи, коллекция fcm_tokens, Security Rules',
    body: `## Описание
Подготовить инфраструктуру для Firebase Cloud Messaging.

## Что будет реализовано
- Генерация VAPID-ключей (npx web-push generate-vapid-keys)
- Добавление VITE_FIREBASE_VAPID_KEY в .env и .env.example
- Создание коллекции fcm_tokens в Firestore
- Security Rules для fcm_tokens (read/write по userId, admin delete)
- Расширение UserPreferences полями notificationTypes
- Расширение app_settings полями reminderHoursBefore, notificationsEnabled

## Схема данных fcm_tokens
- tokenId: string
- userId: string
- fcmToken: string
- platform: web | android | ios
- createdAt: timestamp
- lastUsedAt: timestamp
- isActive: boolean

## Тесты
- Unit: проверка Security Rules
- E2E: проверка что .env содержит VITE_FIREBASE_VAPID_KEY

## Критерий приёмки
✅ Все тесты проходят
✅ Security Rules опубликованы в Firebase

## Ссылки
- NOTIFICATION_MODULE.md разделы 4, 7, 9`,
    labels: ['notification-module', 'phase-2', 'infrastructure']
  },
  {
    title: '2. messagingService.ts — сервис FCM: запрос токена, сохранение, подписка',
    body: `## Описание
Создать сервис для работы с Firebase Cloud Messaging на клиенте.

## Что будет реализовано
- requestNotificationPermission() — запрос Notification.requestPermission()
- getFCMToken() — получение токена через getToken(messaging, { vapidKey })
- saveFCMToken(userId, token) — сохранение в Firestore fcm_tokens
- subscribeToTopic(user-{userId}) — подписка на topic
- refreshToken() — обновление при смене токена
- Обработка ошибок: invalid token, expired, denied permission

## Тесты
- Unit: mocking Firebase messaging, token сохраняется
- Unit: обработка denied permission
- Unit: обработка expired token → очистка
- Integration: запрос разрешения (mock Notification API)

## Критерий приёмки
✅ Все unit-тесты проходят
✅ При permission === 'granted' токен сохраняется в Firestore
✅ При permission === 'denied' — тихий выход без ошибок

## Зависимости
- Issue #1

## Ссылки
- NOTIFICATION_MODULE.md разделы 5.1, 6.1, 11`,
    labels: ['notification-module', 'phase-2', 'client']
  },
  {
    title: '3. useNotifications.ts — хук инициализации FCM и управления разрешениями',
    body: `## Описание
React-хук для управления уведомлениями в компонентах.

## Что будет реализовано
- useNotifications() — возвращает состояние и функции
- initialize() — запрос разрешения + получение токена
- toggle() — вкл/выкл уведомления
- notificationTypes state — управление типами
- Persist preferences в Firestore user doc

## API
- permission: NotificationPermission | null
- isSupported: boolean
- isEnabled: boolean
- notificationTypes: Record<string, boolean>
- initialize(): Promise<void>
- toggle(): Promise<void>
- updateType(type, enabled): Promise<void>

## Тесты
- Unit: hook renders with default state
- Unit: initialize вызывает messagingService
- Unit: toggle обновляет user preferences
- Unit: updateType меняет конкретный тип

## Критерий приёмки
✅ Все unit-тесты проходят
✅ Хук корректно отражает состояние

## Зависимости
- Issue #2

## Ссылки
- NOTIFICATION_MODULE.md разделы 5.1, 6.1`,
    labels: ['notification-module', 'phase-2', 'client']
  },
  {
    title: '4. NotificationSnackbar.tsx — компонент UI-уведомлений (Snackbar/Toast)',
    body: `## Описание
Универсальный Snackbar для мгновенной обратной связи в UI.

## Что будет реализовано
- Компонент NotificationSnackbar
- severity: success, error, warning, info
- auto-hide через 3 сек (настраивается)
- actions: кнопка действия (опционально)
- Queue — поддержка нескольких сообщений
- notistack или собственный на MUI Alert

## API
- enqueueSnackbar({ message, severity, duration, action })

## Тесты
- Unit: рендер с разными severity
- Unit: auto-dismiss через duration
- Unit: action button вызывает onClick
- Unit: queue — несколько сообщений подряд

## Критерий приёмки
✅ Все unit-тесты проходят
✅ Snackbar появляется и исчезает
✅ Queue работает корректно

## Ссылки
- NOTIFICATION_MODULE.md разделы 5.4, 6.1`,
    labels: ['notification-module', 'phase-2', 'client', 'ui']
  },
  {
    title: '5. Service Worker: обработка push-уведомлений (firebase-messaging-sw.js)',
    body: `## Описание
Service Worker для получения и обработки push-уведомлений в фоне.

## Что будет реализовано
- firebase-messaging-sw.js — фоновый обработчик
- push event handler — парсинг payload
- self.registration.showNotification() — отображение
- notificationclick handler — deep links:
  - action 'view' → /class/{classId}
  - action 'cancel' → /class/{classId} с фокусом на отмену
  - default → /
- Настройка vite-plugin-pwa → injectManifest

## Тесты
- Unit: парсинг push payload
- Unit: notificationclick → правильный URL
- Integration: workbox-window регистрация

## Критерий приёмки
✅ Все тесты проходят
✅ Push принимается и отображается
✅ Клик открывает нужную страницу

## Зависимости
- Issue #2

## Ссылки
- NOTIFICATION_MODULE.md разделы 5.3, 6.1`,
    labels: ['notification-module', 'phase-2', 'service-worker']
  },
  {
    title: '6. NotificationSettingsPage — экран настроек типов уведомлений',
    body: `## Описание
Экран в профиле для управления типами уведомлений.

## Что будет реализовано
- Toggle switches для каждого типа:
  - Подтверждение записи
  - Напоминание о занятии
  - Изменение расписания
  - Отмена занятия
  - Освобождение места
  - Административные
- Глобальный toggle Вкл/Выкл все
- Сохранение в user.preferences.notificationTypes
- Индикатор статуса разрешений браузера
- Ссылка на инструкцию при denied permission

## Тесты
- E2E: toggle вкл/выкл, проверка сохранения в Firestore
- E2E: глобальный toggle выключает все
- Unit: компонент рендерится с настройками из store

## Критерий приёмки
✅ Все тесты проходят
✅ Настройки сохраняются в Firestore
✅ UI отражает актуальное состояние

## Зависимости
- Issue #2
- Issue #4

## Ссылки
- NOTIFICATION_MODULE.md разделы 4.2, 6.1`,
    labels: ['notification-module', 'phase-2', 'client', 'ui']
  },
  {
    title: '7. Cloud Functions: notificationService + tokenService',
    body: `## Описание
Базовые сервисы Cloud Functions для отправки уведомлений.

## Что будет реализовано

### tokenService.ts
- saveToken(userId, token, platform)
- invalidateToken(token)
- cleanupExpiredTokens() — scheduled
- getUserTokens(userId) — получить все активные токены

### notificationService.ts
- sendNotification(userId, payload) — через admin.messaging().sendEach()
- sendToTopic(topic, payload)
- handleFCMError(error, token) — обработка ошибок
- Templates для всех типов уведомлений

## Тесты
- Unit: sendNotification вызывает sendEach
- Unit: handleFCMError → invalidate token при expired
- Unit: template генерация для каждого типа
- Integration: mock admin.messaging()

## Критерий приёмки
✅ Все тесты проходят
✅ Tokens сохраняются и инвалидируются
✅ Уведомления отправляются через mock

## Зависимости
- Issue #1

## Ссылки
- NOTIFICATION_MODULE.md разделы 3.2, 5.2, 6.2, 11.3`,
    labels: ['notification-module', 'phase-2', 'cloud-functions']
  },
  {
    title: '8. Cloud Functions: enrollmentTriggers + classTriggers',
    body: `## Описание
Database triggers для автоматической отправки уведомлений при изменениях.

## Что будет реализовано

### enrollmentTriggers.ts
- onWrite(enrollments/{id}):
  - Создание → push 'Запись подтверждена'
  - Удаление → push 'Место освободилось'
  - Проверка user.preferences перед отправкой

### classTriggers.ts
- onWrite(classes/{id}):
  - Изменение времени → push 'Изменение расписания'
  - status → cancelled → push 'Занятие отменено'
  - Отправка всем записанным участникам

## Тесты
- Unit: trigger при создании enrollment
- Unit: trigger при отмене занятия
- Unit: отправка только пользователям с включённым типом
- Integration: mock Firestore + mock messaging

## Критерий приёмки
✅ Все тесты проходят
✅ Триггеры срабатывают на изменения
✅ Учитываются preferences пользователей

## Зависимости
- Issue #7

## Ссылки
- NOTIFICATION_MODULE.md разделы 3.1, 5.2, 6.2`,
    labels: ['notification-module', 'phase-2', 'cloud-functions']
  },
  {
    title: '9. Cloud Functions: reminders.ts — cron напоминания за 2 часа',
    body: `## Описание
Scheduled function для отправки напоминаний о занятиях.

## Что будет реализовано
- PubSub scheduled function (каждые 15 минут)
- Query: занятия через 2 часа ± 15 мин
- Для каждого занятия: получить записанных, проверить preferences, отправить
- Дедупликация: флаг reminderSent в классе
- Логирование: сколько отправлено

## Тесты
- Unit: query находит занятия в окне 2ч
- Unit: отправка только записанным с включённым reminder
- Unit: дедупликация (reminderSent = true)
- Integration: mock scheduler + messaging

## Критерий приёмки
✅ Все тесты проходят
✅ Напоминания отправляются за 2 часа
✅ Нет дубликатов

## Зависимости
- Issue #7

## Ссылки
- NOTIFICATION_MODULE.md разделы 3.1, 3.2.2, 6.2`,
    labels: ['notification-module', 'phase-2', 'cloud-functions']
  },
  {
    title: '10. Firebase Hosting: деплой PWA и Cloud Functions',
    body: `## Описание
Настроить деплой на Firebase Hosting и Cloud Functions.

## Что будет реализовано
- firebase init hosting + functions
- Настройка public directory → dist/
- Настройка rewrites для SPA (/* → /index.html)
- GitHub Actions CI/CD:
  - Build на push в main
  - Deploy на Firebase Hosting
  - Deploy Functions при изменении functions/

## CI/CD Pipeline
1. npm install
2. npm run build
3. npm run test:e2e
4. firebase deploy --only hosting,functions

## Тесты
- E2E: приложение доступно после деплоя
- E2E: Service Worker зарегистрирован

## Критерий приёмки
✅ CI/CD pipeline проходит
✅ PWA доступно по https URL
✅ Functions работают в production

## Зависимости
- Все предыдущие issues

## Ссылки
- NOTIFICATION_MODULE.md раздел 6`,
    labels: ['notification-module', 'phase-2', 'devops']
  },
  {
    title: '11. E2E тесты модуля уведомлений',
    body: `## Описание
End-to-end тесты для всего цикла уведомлений.

## Что будет реализовано
- E2E: пользователь включает уведомления → токен сохраняется
- E2E: запись на занятие → появляется Snackbar 'Запись подтверждена'
- E2E: отмена записи → Snackbar 'Запись отменена'
- E2E: настройка типов уведомлений в профиле
- E2E: Service Worker регистрация

## Тесты
- Playwright: все сценарии
- CI: запуск в headless Chrome

## Критерий приёмки
✅ 100% E2E тестов проходят
✅ CI pipeline зелёный

## Зависимости
- Issue #4 (Snackbar)
- Issue #6 (Settings)

## Ссылки
- NOTIFICATION_MODULE.md раздел 10.5`,
    labels: ['notification-module', 'phase-2', 'testing']
  }
];

function createIssue(issue, index) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      title: issue.title,
      body: issue.body,
      labels: issue.labels
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/issues`,
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'node'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(body);
        if (parsed.html_url) {
          console.log(`✅ #${index + 1}: ${parsed.html_url}`);
        } else {
          console.log(`❌ #${index + 1}: ${parsed.message || body.substring(0, 100)}`);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  for (let i = 0; i < issues.length; i++) {
    await createIssue(issues[i], i);
  }
  console.log('\nDone!');
}

main();
