# Техническая документация: Модуль уведомлений (Notification Module)

**Версия:** 1.0  
**Дата:** 14 апреля 2026 г.  
**Статус:** Черновик

---

## 1. Обзор

Модуль уведомлений обеспечивает отправку push-уведомлений и внутриприкладных сообщений пользователям фитнес-студии. Реализован на базе **Firebase Cloud Messaging (FCM)** + **Workbox Service Worker** (через Vite PWA Plugin).

### 1.1. Цели модуля
- Своевременное информирование клиентов о предстоящих занятиях
- Оперативное оповещение об изменениях в расписании
- Подтверждение действий пользователя (запись, отмена)
- Информирование администраторов о событиях в системе

### 1.2. Архитектура
```
┌─────────────────────────────────────────────────────┐
│                    Клиент (PWA)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  FCM Token   │  │  UI Toasts   │  │  Profile  │  │
│  │  (browser)   │  │  (Snackbar)  │  │  Toggle   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                 │        │
│  ┌──────▼─────────────────▼─────────────────▼─────┐  │
│  │          Service Worker (Workbox)               │  │
│  │  - push event handler                           │  │
│  │  - notificationclick handler                    │  │
│  └──────────────────────┬──────────────────────────┘  │
└─────────────────────────┼─────────────────────────────┘
                          │
                   HTTPS / FCM
                          │
┌─────────────────────────▼─────────────────────────────┐
│                  Firebase Cloud Messaging               │
│  - Отправка push-уведомлений по токенам                │
│  - Topic-based рассылка                                │
└─────────────────────────┬─────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────┐
│              Firebase Cloud Functions                  │
│  (Бэкенд-триггеры для отправки уведомлений)            │
│  - onWrite(enrollments) → push записавшемуся          │
│  - onWrite(classes) → push при изменении расписания   │
│  - Scheduled function → напоминания за 2 часа         │
└─────────────────────────┬─────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────┐
│                   Firestore Database                   │
│  - Триггеры Cloud Functions на изменение коллекций     │
│  - collection: fcm_tokens (токены устройств)           │
└───────────────────────────────────────────────────────┘
```

---

## 2. Текущее состояние реализации

### 2.1. Реализовано (Фаза 1)

| Компонент | Статус | Расположение |
|-----------|--------|-------------|
| `notificationsEnabled` в `UserPreferences` | ✅ | `src/types/index.ts` |
| `getMessagingService()` helper | ✅ | `src/services/firebase.ts:24-31` |
| UI-элемент в профиле (статус вкл/выкл) | ⚠️ | `src/pages/ProfilePage.tsx:103-107` (косметический) |
| Значение по умолчанию `true` при регистрации | ✅ | `src/services/authService.ts:36,64` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | `.env.example`, `src/vite-env.d.ts` |

### 2.2. Не реализовано (Фаза 2)

| Компонент | Описание |
|-----------|----------|
| Запрос разрешения на уведомления | `Notification.requestPermission()` + `getToken()` |
| Сохранение FCM-токена в Firestore | Коллекция `fcm_tokens` |
| Обработка push-сообщений | Service worker с `push` и `notificationclick` |
| Внутриприкладные уведомления | Snackbar/Toast компоненты для UI |
| Cloud Functions | Триггеры для отправки уведомлений |
| Scheduled функция | Напоминания за 2 часа до занятия |
| Настройка уведомлений в профиле | Включение/выключение, выбор типов |

---

## 3. Типы уведомлений

### 3.1. Матрица уведомлений

| # | Тип | Триггер | Получатели | Канал | Приоритет |
|---|-----|---------|-----------|-------|-----------|
| 1 | **Подтверждение записи** | Создание записи в `enrollments` | Записавшийся пользователь | Push + UI Snackbar | Средний |
| 2 | **Напоминание о занятии** | Cron: за 2 часа до `startDateTime` | Все записанные участники | Push | Высокий |
| 3 | **Изменение расписания** | Обновление документа в `classes` | Все записанные участники | Push | Высокий |
| 4 | **Отмена занятия** | `classes.status` → `cancelled` | Все записанные участники | Push | Критический |
| 5 | **Освобождение места** | Отмена записи (`enrollments.status` → `cancelled`) | Пользователи в листе ожидания | Push | Средний |
| 6 | **Административные** | Новые записи, удаления | Администраторы | Push | Низкий |

### 3.2. Шаблоны уведомлений

#### 3.2.1. Подтверждение записи
```json
{
  "title": "Запись подтверждена",
  "body": "Вы записаны на «{className}» {date} в {time}",
  "data": {
    "type": "enrollment_confirmed",
    "classId": "{classId}",
    "enrollmentId": "{enrollmentId}"
  },
  "icon": "/icons/icon-192x192.png",
  "badge": "/icons/badge-72x72.png",
  "tag": "enrollment-{classId}",
  "actions": [
    { "action": "view", "title": "Посмотреть" },
    { "action": "cancel", "title": "Отменить" }
  ]
}
```

#### 3.2.2. Напоминание о занятии
```json
{
  "title": "Напоминание: через 2 часа",
  "body": "«{className}» начнётся в {time}. Не опаздывайте!",
  "data": {
    "type": "class_reminder",
    "classId": "{classId}"
  },
  "icon": "/icons/icon-192x192.png",
  "tag": "reminder-{classId}",
  "requireInteraction": false,
  "silent": false
}
```

#### 3.2.3. Изменение/отмена занятия
```json
{
  "title": "Изменение в расписании",
  "body": "Занятие «{className}» {date} в {time} {изменено/отменено}. {Причина}",
  "data": {
    "type": "class_changed" | "class_cancelled",
    "classId": "{classId}"
  },
  "icon": "/icons/icon-192x192.png",
  "tag": "class-update-{classId}",
  "requireInteraction": true,
  "actions": [
    { "action": "view", "title": "Подробнее" }
  ]
}
```

---

## 4. Схема данных

### 4.1. Новая коллекция: `fcm_tokens`

Хранит FCM-токены устройств для каждого пользователя.

```
{
  "tokenId": "string",           // Авто-ID документа
  "userId": "string",            // ID пользователя (Firebase Auth UID)
  "fcmToken": "string",          // FCM токен устройства
  "platform": "web" | "android" | "ios",
  "createdAt": "timestamp",      // Дата регистрации токена
  "lastUsedAt": "timestamp",     // Последнее использование
  "isActive": true               // Активен ли токен
}
```

**Индексы:**
- `userId` (Ascending) — для поиска всех токенов пользователя
- `isActive` (Ascending) — для фильтрации неактивных токенов

### 4.2. Расширение `UserPreferences`

```typescript
interface UserPreferences {
  favoriteTypes?: string[]
  notificationsEnabled?: boolean
  notificationTypes?: {
    enrollment_confirmed?: boolean   // Подтверждение записи (по умолчанию: true)
    class_reminder?: boolean         // Напоминание (по умолчанию: true)
    class_changed?: boolean          // Изменение расписания (по умолчанию: true)
    class_cancelled?: boolean        // Отмена занятия (по умолчанию: true)
    waitlist_opening?: boolean       // Освобождение места (по умолчанию: true)
    admin_notifications?: boolean    // Административные (по умолчанию: true)
  }
}
```

### 4.3. Расширение `app_settings`

```
{
  "scheduleWeeksAvailable": 2,
  "cancellationDeadlineMinutes": 60,
  "maxMessagesPerDay": 5,
  "messageSpamIntervalMinutes": 1,
  "reminderHoursBefore": 2,          // За сколько часов до занятия отправлять напоминание
  "notificationsEnabled": true       // Глобальное включение/выключение уведомлений
}
```

---

## 5. Flow уведомлений

### 5.1. Инициализация FCM (клиент)

```
1. Пользователь авторизуется
2. Проверяем user.preferences.notificationsEnabled
   ├─ false → не запрашиваем разрешение
   └─ true  → переходим к шагу 3
3. Notification.requestPermission()
   ├─ denied → сохраняем статус, не отправляем
   ├─ granted → переходим к шагу 4
   └─ default → ждём явного действия пользователя
4. getToken(messaging, { vapidKey }) → fcmToken
5. Сохраняем fcmToken в Firestore: fcm_tokens
6. Подписываемся на topic: user-{userId}
```

### 5.2. Отправка уведомления (Cloud Function)

```
1. Триггер (onWrite, schedule, HTTP call)
2. Определяем получателей (userId list)
3. Для каждого userId:
   a. Загружаем fcm_tokens (isActive == true)
   b. Проверяем user.preferences.notificationTypes[type]
   c. Если тип включён → отправляем через admin.messaging().sendEach()
4. Обрабатываем ошибки (invalid token → ставим isActive = false)
```

### 5.3. Обработка push на клиенте (Service Worker)

```
1. Service Worker получает push-событие
2. Парсит payload: type, data, actions
3. Отображает notification через self.registration.showNotification()
4. При клике на notification:
   ├─ action === "view" → открывает /class/{classId}
   ├─ action === "cancel" → открывает /class/{classId} с фокусом на отмену
   └─ default → открывает главную страницу
```

### 5.4. Внутриприкладные уведомления (UI Snackbar)

Используются для мгновенной обратной связи без push:

```
1. Пользователь выполняет действие (запись, отмена)
2. Компонент вызывает enqueueSnackbar() (notistack) или показывает MUI Alert
3. Snackbar автоматически исчезает через 3 секунды
4. Не требует Service Worker или FCM
```

---

## 6. Компоненты для реализации

### 6.1. Клиентская часть

| Файл | Назначение |
|------|-----------|
| `src/services/messagingService.ts` | FCM: запрос токена, сохранение, подписка на topics |
| `src/hooks/useNotifications.ts` | Хук: проверка разрешений, инициализация, toggle |
| `src/components/NotificationSnackbar.tsx` | Универсальный Snackbar для UI-уведомлений |
| `public/firebase-messaging-sw.js` | Service worker для обработки push-уведомлений |
| `src/pages/NotificationSettingsPage.tsx` | Экран настроек уведомлений (выбор типов) |

### 6.2. Серверная часть (Cloud Functions)

| Файл | Назначение |
|------|-----------|
| `functions/src/triggers/enrollmentTriggers.ts` | onWrite(enrollments) → push подтверждения |
| `functions/src/triggers/classTriggers.ts` | onWrite(classes) → push об изменениях |
| `functions/src/scheduled/reminders.ts` | Cron: за 2 часа → напоминания |
| `functions/src/services/notificationService.ts` | Общая логика отправки (template, recipients, send) |
| `functions/src/services/tokenService.ts` | Управление FCM-токенами (save, cleanup, invalidate) |

### 6.3. Firebase конфигурация

| Файл | Назначение |
|------|-----------|
| `vite.config.ts` (PWA plugin) | Добавление `injectManifest`, `globPatterns` для sw |
| `public/manifest.json` | Добавление `gcm_sender_id` |
| `.env` | `VITE_FIREBASE_VAPID_KEY` |

---

## 7. Security Rules

### 7.1. `fcm_tokens`

```
match /fcm_tokens/{tokenId} {
  allow read: if request.auth != null &&
    resource.data.userId == request.auth.uid;
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null &&
    resource.data.userId == request.auth.uid;
  // Админ может удалять токены (блокировка пользователя)
  allow delete: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles is list &&
    'admin' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles;
}
```

---

## 8. Ограничения платформ

### 8.1. Android (Chrome)
- ✅ Полная поддержка push-уведомлений
- ✅ Фоновые уведомления через Service Worker
- ✅ Rich notifications с actions
- ✅ Badges на иконке приложения

### 8.2. iOS (Safari)
- ⚠️ Push-уведомления только с iOS 16.4+
- ⚠️ Только при добавлении PWA на домашний экран
- ⚠️ Не работают в Safari (только в standalone PWA)
- ⚠️ Нет поддержки notification actions
- ⚠️ Нет поддержки silent push

### 8.3. Desktop (Chrome, Firefox, Edge)
- ✅ Полная поддержка push-уведомлений
- ✅ Rich notifications
- ⚠️ Firefox: нет поддержки notification actions

### 8.4. Рекомендация
Для iOS использовать fallback — внутриприкладные уведомления (Snackbar/Alert) при открытии приложения + email-уведомления.

---

## 9. VAPID ключи

Для веб-push уведомлений требуется пара VAPID-ключей:

**Генерация:**
```bash
npx web-push generate-vapid-keys
```

**Результат:**
```
Public Key:  BNq-... (для клиента, VITE_FIREBASE_VAPID_KEY)
Private Key: ...   (для сервера, Firebase Functions)
```

**Настройка Firebase Console:**
1. Project Settings → Cloud Messaging → Web Push certificates
2. Или использовать FCM VAPID через `messagingSenderId`

---

## 10. План реализации (Фаза 2)

### 10.1. Этап 1: Инфраструктура (1-2 дня)
- [ ] Сгенерировать VAPID-ключи
- [ ] Добавить `VITE_FIREBASE_VAPID_KEY` в `.env`
- [ ] Создать коллекцию `fcm_tokens` в Firestore
- [ ] Написать Security Rules для `fcm_tokens`
- [ ] Создать `src/services/messagingService.ts`

### 10.2. Этап 2: Клиентская часть (2-3 дня)
- [ ] `useNotifications.ts` — хук инициализации FCM
- [ ] Запрос разрешения `Notification.requestPermission()`
- [ ] Сохранение токена в Firestore
- [ ] `NotificationSnackbar.tsx` — универсальный компонент
- [ ] Обновить `ProfilePage.tsx` — рабочая кнопка настроек
- [ ] `NotificationSettingsPage.tsx` — выбор типов уведомлений

### 10.3. Этап 3: Service Worker (1 день)
- [ ] `public/firebase-messaging-sw.js` — обработка push
- [ ] `notificationclick` handler с deep links
- [ ] Настройка `vite-plugin-pwa` → `injectManifest`

### 10.4. Этап 4: Cloud Functions (3-4 дня)
- [ ] `notificationService.ts` — общая логика отправки
- [ ] `tokenService.ts` — управление токенами
- [ ] `enrollmentTriggers.ts` — триггер на запись
- [ ] `classTriggers.ts` — триггер на изменение занятия
- [ ] `reminders.ts` — cron функция (каждые 15 мин)
- [ ] Deploy функций: `firebase deploy --only functions`

### 10.5. Этап 5: Тестирование (1-2 дня)
- [ ] Unit-тесты: `messagingService.ts`, `useNotifications.ts`
- [ ] Integration: отправка тестового уведомления
- [ ] E2E: проверка Snackbar при записи/отмене
- [ ] Кросс-платформенное тестирование (Android, iOS, Desktop)

---

## 11. Диагностика и мониторинг

### 11.1. Логирование
```typescript
// Клиент
console.log('[Notifications] Permission:', permission)
console.log('[Notifications] FCM Token:', token)

// Cloud Functions
functions.logger.info(`Sending notification to ${userId}`, { type, classId })
functions.logger.error(`FCM error: ${error.message}`, { token, userId })
```

### 11.2. Метрики
- Количество активных FCM-токенов по платформам
- Delivery rate (доставленные / отправленные)
- Invalid token rate (для очистки)
- Open rate (клики по уведомлениям)

### 11.3. Обработка ошибок
| Ошибка | Действие |
|--------|----------|
| `messaging/token-expired` | Удалить токен, не отправлять |
| `messaging/invalid-registration-token` | Удалить токен |
| `messaging/registration-token-not-registered` | Удалить токен |
| `messaging/too-many-topics` | Уменьшить количество topics |
| `Notification.permission === 'denied'` | Показать инструкцию по включению в настройках браузера |

---

## 12. Зависимости

### 12.1. Текущие (уже установлены)
```json
{
  "firebase": "^10.14.1",         // Включает @firebase/messaging
  "vite-plugin-pwa": "^0.21.1",   // Service Worker generation
  "workbox-window": "^7.3.0"      // Workbox client utilities
}
```

### 12.2. Дополнительные (для Фазы 2)
```json
{
  "notistack": "^3.0.1"           // Улучшенные Snackbar (опционально)
}
```

### 12.3. Cloud Functions
```json
{
  "firebase-admin": "^12.0.0",    // Admin SDK (sendEach)
  "firebase-functions": "^5.0.0"  // Cloud Functions framework
}
```

---

*Конец документа*
