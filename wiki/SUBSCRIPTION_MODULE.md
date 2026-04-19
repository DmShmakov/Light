# Техническая документация: Модуль абонементов (Subscription Module)

**Версия:** 1.0  
**Дата:** 20 апреля 2026 г.  
**Статус:** Реализован (клиентская часть)

---

## 1. Обзор

Модуль абонементов обеспечивает управление доступом к записи на занятия через систему тарифных планов. Пользователь не может записаться на занятие без активного оплаченного абонемента, покрывающего дату занятия.

### 1.1. Ключевые возможности

- Создание тарифных планов администратором (пакет занятий, безлимит, смешанные)
- Самостоятельный выбор абонемента пользователем с указанием даты начала
- Подтверждение оплаты администратором
- Автоматическое списание визитов при записи и возврат при отмене
- Управление абонементами пользователей из админ-панели

### 1.2. Архитектура

```
┌──────────────────────────────────────────────────────┐
│                     Клиент (PWA)                      │
│                                                       │
│  SubscriptionPage     ClassDetailsPage   ProfilePage  │
│       │                     │                │        │
│       └──────────┬──────────┘                │        │
│                  │                           │        │
│       subscriptionService.ts      SubscriptionStatus  │
│                  │                                    │
└──────────────────┼────────────────────────────────────┘
                   │ Firestore SDK
┌──────────────────┼────────────────────────────────────┐
│   Firestore       │                                    │
│  ┌────────────────▼──────┐  ┌─────────────────────┐   │
│  │  subscriptionPlans    │  │  userSubscriptions  │   │
│  │  (справочник тарифов) │  │  (абонементы юзеров)│   │
│  └───────────────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 2. Модель данных

### 2.1. Коллекция `subscriptionPlans` — тарифные планы

| Поле | Тип | Описание |
|---|---|---|
| `planId` | `string` | ID документа Firestore |
| `name` | `string` | Название тарифа |
| `description` | `string` | Описание |
| `visitsCount` | `number \| null` | Количество занятий; `null` = безлимит по визитам |
| `durationDays` | `number \| null` | Срок действия в днях; `null` = без ограничения по времени |
| `isActive` | `boolean` | Виден ли пользователям при выборе |
| `createdAt` | `Timestamp` | Дата создания |

**Примеры тарифов:**

| Название | visitsCount | durationDays | Описание |
|---|---|---|---|
| 1 занятие | 1 | null | Разовый визит |
| 8 занятий | 8 | 60 | Пакет, действует 60 дней |
| Безлимит на месяц | null | 30 | Неограниченное количество занятий в месяц |
| Годовой безлимит | null | 365 | Безлимит на год |

### 2.2. Коллекция `userSubscriptions` — абонементы пользователей

| Поле | Тип | Описание |
|---|---|---|
| `subscriptionId` | `string` | ID документа |
| `userId` | `string` | UID пользователя |
| `userName` | `string` | Имя (денормализовано) |
| `userEmail` | `string` | Email (денормализовано) |
| `planId` | `string` | Ссылка на тариф |
| `planName` | `string` | Название тарифа на момент создания (денормализовано) |
| `visitsTotal` | `number \| null` | Лимит визитов; `null` = безлимит |
| `visitsUsed` | `number` | Использовано визитов |
| `durationDays` | `number \| null` | Срок из тарифа |
| `startDate` | `Timestamp \| null` | Дата начала (выбирает пользователь) |
| `expiresAt` | `Timestamp \| null` | `startDate + durationDays`; `null` если нет срока |
| `status` | `SubscriptionStatus` | Текущий статус |
| `enrolledClassIds` | `string[]` | ID занятий, привязанных к абонементу |
| `createdAt` | `Timestamp` | Дата создания |
| `updatedAt` | `Timestamp` | Дата последнего изменения |

### 2.3. Статусы абонемента

```
unpaid ──(admin: setSubscriptionPaid)──▶ active
active ──(visitsUsed == visitsTotal)──▶ exhausted
active ──(now > expiresAt)──▶ expired     ← runtime-проверка или Cloud Function
```

| Статус | Значение | Цвет в UI |
|---|---|---|
| `unpaid` | Создан, ожидает оплаты | Оранжевый (warning) |
| `active` | Оплачен, действует | Зелёный (success) |
| `expired` | Истёк срок | Красный (error) |
| `exhausted` | Исчерпаны визиты | Серый (default) |

---

## 3. Сервисный слой

**Файл:** `src/services/subscriptionService.ts`

### 3.1. Функции управления тарифами

| Функция | Доступ | Описание |
|---|---|---|
| `getActiveSubscriptionPlans()` | Все | Тарифы с `isActive: true` |
| `getAllSubscriptionPlans()` | Админ | Все тарифы включая скрытые |
| `createSubscriptionPlan(data)` | Админ | Создать тариф |
| `updateSubscriptionPlan(planId, data)` | Админ | Обновить тариф |

### 3.2. Функции управления абонементами

| Функция | Доступ | Описание |
|---|---|---|
| `getCurrentUserSubscription(userId)` | Пользователь | Активный или неоплаченный абонемент |
| `createUserSubscription(userId, ...)` | Пользователь/Админ | Создать абонемент (статус `unpaid`) |
| `setSubscriptionPaid(subscriptionId)` | Админ | Перевести в `active` |
| `changeSubscriptionPlan(subscriptionId, plan)` | Админ | Сменить тариф, `visitsUsed` сохраняется |
| `extendSubscription(subscriptionId, days)` | Админ | Сдвинуть `expiresAt` на N дней |
| `getAllSubscriptions()` | Админ | Все абонементы всех пользователей |
| `incrementSubscriptionVisit(subId, classId)` | Клиент | Списать визит, привязать занятие |
| `decrementSubscriptionVisit(subId, classId)` | Клиент | Вернуть визит, отвязать занятие |

### 3.3. Проверка валидности

```typescript
checkSubscriptionForClass(
  subscription: UserSubscription | null,
  classDate: Date
): { valid: boolean; reason: string }
```

Последовательность проверок:
1. Абонемент существует
2. Статус `active`
3. `now <= expiresAt` (runtime-проверка истечения)
4. `classDate >= startDate`
5. `classDate <= expiresAt`
6. `visitsUsed < visitsTotal` (если не безлимит)

---

## 4. Пользовательские сценарии

### 4.1. Получение абонемента

```
Пользователь → /subscription
  → Выбирает тариф из списка
  → Указывает дату начала
  → Абонемент создан со статусом "Не оплачен"
  → Администратор подтверждает оплату → статус "Активен"
  → Пользователь может записываться на занятия
```

### 4.2. Запись на занятие

```
ClassDetailsPage.handleEnroll()
  → checkSubscriptionForClass(subscription, classDate)
  │   ├── valid: false → navigate('/subscription') + Alert с причиной
  │   └── valid: true  → enrollInClass(classId, userId, classDate)
  │                     → incrementSubscriptionVisit(subscriptionId, classId)
  │                     → обновить subscription в локальном state
  └── Snackbar "Вы успешно записаны"
```

### 4.3. Отмена записи

```
ClassDetailsPage.handleCancel()
  → cancelEnrollment(enrollmentId)
  → если canCancel (> 60 мин до начала):
  │   → decrementSubscriptionVisit(subscriptionId, classId)
  │   → визит возвращается, classId удаляется из enrolledClassIds
  │   → если статус был exhausted → возвращается в active
  └── Snackbar "Запись отменена"
```

### 4.4. Исчерпание абонемента

```
incrementSubscriptionVisit()
  → visitsUsed++ (Firestore increment)
  → если visitsUsed >= visitsTotal:
  │   → status = 'exhausted'
  └── При следующей попытке записи: "Визиты исчерпаны" → /subscription
```

---

## 5. Интерфейсы

### 5.1. Страница абонемента (`/subscription`)

**Если абонемент есть (unpaid/active):**
```
┌──────────────────────────────────┐
│ 8 занятий          [Активен ✓]   │
│ Начало: 1 мая 2026               │
│ Действует до: 30 июня 2026       │
│                                  │
│ Визиты  ████████░░  3/8 исп.     │
│ Осталось: 5 занятий              │
│                                  │
│ Занятий по абонементу: 3         │
└──────────────────────────────────┘
```

**Если абонемента нет или исчерпан:**
```
┌──────────────────────────────────┐
│ Нет активного абонемента         │
│                                  │
│ Выбрать абонемент                │
│ ┌──────────────────────────────┐ │
│ │ 8 занятий  · [8 занятий]     │ │
│ │ 60 дней                      │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Безлимит   · [Безлимит]      │ │
│ │ 30 дней                      │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### 5.2. Виджет в профиле (`SubscriptionStatus`)

```
┌──────────────────────────────────┐
│ 8 занятий          [Активен]     │
│ Визиты  ████░░░░  3/8           │
│ До 30 июня 2026                  │
└──────────────────────────────────┘
```
Кликабелен → навигирует на `/subscription`.

### 5.3. Страница занятия — блок записи

**Нет абонемента / не оплачен:**
```
⚠ Нет абонемента — управление абонементом   [ссылка]
[ Записаться ]   ← задизейблена
```

**Вне срока абонемента:**
```
⚠ Занятие вне срока абонемента — управление абонементом
[ Записаться ]   ← задизейблена
```

**Абонемент валиден:**
```
[ Записаться ]   ← активна
```

---

## 6. Административные интерфейсы

### 6.1. Типы абонементов (`/admin/subscription-plans`)

CRUD тарифных планов. Форма включает:
- Название и описание
- Переключатель «Безлимитный по визитам» / поле количества занятий
- Переключатель «Без ограничения срока» / поле количества дней
- Переключатель видимости (скрыть устаревший тариф без удаления)

### 6.2. Управление абонементами (`/admin/subscriptions`)

Список всех абонементов пользователей с действиями:

| Действие | Условие | Что происходит |
|---|---|---|
| Отметить оплаченным | `status = unpaid` | `status → active` |
| Сменить план | Любой статус | Меняет `planId`, `planName`, `visitsTotal`, `durationDays`; `visitsUsed` сохраняется |
| Продлить | Есть `durationDays` | `expiresAt += N дней` |
| Добавить абонемент | — | Создаёт абонемент любому пользователю |

---

## 7. Правила безопасности Firestore

```javascript
// subscriptionPlans: читают авторизованные, пишет только админ
match /subscriptionPlans/{planId} {
  allow read: if request.auth != null;
  allow create, update, delete: if isAdmin();
}

// userSubscriptions: доступ только к своим; обновление — владелец или админ
match /userSubscriptions/{subscriptionId} {
  allow read: if request.auth != null &&
    (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null &&
    (resource.data.userId == request.auth.uid || isAdmin());
  allow delete: if isAdmin();
}
```

> **Замечание по безопасности:** пользователь технически может изменить своё поле `visitsUsed` с клиента. Для продакшн-среды рекомендуется перенести операции списания/возврата визитов в Cloud Functions, тригируемые изменениями в коллекции `enrollments`.

---

## 8. Требуемые индексы Firestore

Создаются в Firebase Console → Firestore → Indexes → Composite:

| Коллекция | Поля | Тип |
|---|---|---|
| `userSubscriptions` | `userId ASC`, `status ASC` | Composite |
| `subscriptionPlans` | `isActive ASC`, `createdAt ASC` | Composite |

---

## 9. Известные ограничения и доработки

### 9.1. Текущие ограничения

- **Автоматическое истечение** — статус `expired` не проставляется автоматически. Используется runtime-проверка `now > expiresAt` в `checkSubscriptionForClass`. Для корректного отображения везде рекомендуется добавить Cloud Function по расписанию.
- **Один активный абонемент** — у пользователя не может быть двух одновременных абонементов. При необходимости потребуется переработка логики выбора абонемента.
- **Без интеграции оплаты** — оплата подтверждается вручную администратором. Интеграция с эквайрингом (ЮKassa и др.) является отдельной задачей.

### 9.2. Рекомендуемые доработки

- **Cloud Function `onEnrollmentCreate`** — при создании записи автоматически обновлять `visitsUsed` и `enrolledClassIds` через admin SDK (устраняет риск клиентской манипуляции)
- **Cloud Function `dailySubscriptionExpiry`** — ежедневно переводить абонементы с истёкшим `expiresAt` в статус `expired`
- **Уведомления об истечении** — push-уведомление за 3/7 дней до окончания абонемента
