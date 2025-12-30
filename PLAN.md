# План: LLMs.txt Generator - WebSocket + Список генераций

## Описание

Реализовать UI с:
1. **Список генераций** - пагинированный список с прогрессом и операциями
2. **Hostname анализ** - проверка хоста + статистика перед генерацией
3. **WebSocket updates** - real-time обновления через Socket.IO (без polling)
4. **Детальный вид** - отдельная страница для генерации

---

## User Flow

### 1. Главная страница (`/`)
- Список генераций пользователя (hostname, status, progress, дата, кнопка удалить)
- Пагинация (default: 5 per page, настраиваемо)
- Секция создания новой генерации:
  - Ввод hostname → валидация → анализ (показ кол-ва URLs)
  - Выбор провайдера: "Бесплатно" (Ollama) | "Быстро" (Gemini)
  - Запуск генерации

### 2. Генерация стартует
- Появляется в списке со статусом `WAITING`
- WebSocket начинает отправлять обновления
- Прогресс бар показывает `processedUrls / totalUrls`

### 3. Детальный вид (`/generations/:id`)
- Клик на генерацию → переход на детальную страницу
- Показ полного llms.txt контента
- Прогресс бар (для активных)
- Кнопки: Копировать, Скачать, Удалить

### 4. WebSocket Updates
- **Initial load:** API запрос → данные из БД (статусы)
- **После загрузки:** WebSocket подключение → real-time обновления
- **Обновления:** BullMQ events → WebSocket messages

### 5. Обновление страницы
- Для активных генераций: показать "Processing..." без процентов
- После первого WebSocket update → показать прогресс `processedUrls / totalUrls`

---

## Архитектура

### Backend (NestJS)

#### 1. WebSocket Gateway
**Файл:** `apps/api/src/websocket/websocket.gateway.ts`

**Библиотека:** Socket.IO (`@nestjs/platform-socket.io`)

**Функции:**
- Аутентификация через session cookie
- Подписка на обновления генераций: `socket.emit('subscribe', { generationIds: [1, 2, 3] })`
- Отписка: `socket.emit('unsubscribe', { generationIds: [1] })`
- Глобальное соединение (одно на клиента)

**Events (emit to client):**
- `generation:progress` - обновление прогресса (generationId, status, processedUrls, totalUrls)
- `generation:status` - изменение статуса (generationId, status, content?, errorMessage?, entriesCount?)

#### 2. BullMQ Event Listener
**Файл:** `apps/api/src/queue/handlers/generation-job.handler.ts`

**Изменения:**
- При обработке каждого батча → emit event через EventEmitter
- Events: `generation.progress`, `generation.completed`, `generation.failed`
- Payload: generationId, processedUrls, totalUrls, status

#### 3. Delete Endpoint Enhancement
**Endpoint:** `DELETE /api/generations/:id`

**Логика:**
1. Удалить из БД (`generationRepository.delete(id)`)
2. Удалить из BullMQ очереди (`queue.remove(jobId)`)
3. Если job активен → `job.remove()` (прервать выполнение)

#### 4. Stats Endpoint (уже реализовано)
**Endpoint:** `GET /api/stats/host?hostname=...`

**Response:** hostname, urlsCount, isComplete (флаг завершённости подсчёта)

---

### Frontend (SvelteKit)

#### 1. Главная страница
**Файл:** `apps/ui/src/routes/+page.svelte`

**State:** generations (массив), page, limit, total

**Компоненты:**
- `GenerationsList.svelte` - список с пагинацией
- `GenerationListItem.svelte` - элемент списка (hostname, status, progress, кнопки)
- `NewGenerationForm.svelte` - форма создания (hostname input + анализ + выбор провайдера)

**WebSocket:**
- Подключение при onMount
- Subscribe к списку generation IDs
- Слушать события: generation:progress, generation:status
- Disconnect при onDestroy

#### 2. Детальная страница
**Файл:** `apps/ui/src/routes/generations/[id]/+page.svelte`

**Компоненты:**
- `GenerationDetail.svelte` - основной компонент
- `ProgressBar.svelte` - прогресс бар (переиспользуемый)
- `ContentDisplay.svelte` - показ llms.txt (как сейчас ResultDisplay)

**State:** generation (объект), progress (processed/total)

**WebSocket:**
- Загрузить данные генерации при onMount
- Subscribe к конкретному generation ID
- Обновлять progress и status при получении событий

#### 3. WebSocket Service
**Файл:** `apps/ui/src/lib/services/websocket.service.ts`

**Singleton класс с методами:**
- connect() - подключение к серверу
- subscribe(generationIds) - подписка на обновления
- unsubscribe(generationIds) - отписка
- on(event, callback) - слушать события
- disconnect() - отключение

---

## Задачи

### ✅ API (Backend) - Stats - ЗАВЕРШЕНО

1. **Stats Domain**
   - [x] Создан StatsModule
   - [x] Endpoint `GET /api/stats/host` с timeout 10 сек
   - [x] AnalyzeHostnameDtoResponse с флагом `isComplete`

### ✅ UI Config - ЗАВЕРШЕНО

2. **Config & Service**
   - [x] StatsService с методом `analyzeHost()`
   - [x] Увеличен timeout до 180 сек

---

### ✅ Backend - WebSocket - ЗАВЕРШЕНО

3. **WebSocket Module**
   - [x] Установить `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io`
   - [x] Создать `WebSocketModule` (`apps/api/src/websocket/websocket.module.ts`)
   - [x] Создать `WebSocketGateway` с CORS конфигурацией
   - [x] Реализовать subscribe/unsubscribe логику (Socket.IO rooms)
   - [ ] Добавить `@UseGuards(WsAuthGuard)` для проверки сессии (отложено)

4. **Event Emitter Integration**
   - [x] Установить `@nestjs/event-emitter`
   - [x] Добавить `EventEmitterModule` в app.module.ts
   - [x] В `GenerationJobHandler`: emit events при прогрессе
     - [x] `generation.progress` (после обработки батча)
     - [x] `generation.status` для completed (после завершения)
     - [x] `generation.status` для failed (при ошибке)
   - [x] В `WebSocketGateway`: слушать events и отправлять в WebSocket
   - [x] Использованы классы вместо интерфейсов: `GenerationProgressEvent`, `GenerationStatusEvent`

5. **Delete Enhancement**
   - [x] Обновить `DELETE /api/generations/:id`
   - [x] Удаление из БД
   - [x] Удаление из BullMQ (`queue.remove(jobId)`)
   - [ ] Emit event `generation.deleted` через WebSocket (не требуется пока)

---

### ⏳ Frontend - WebSocket Client

6. **WebSocket Service**
   - [ ] Установить `socket.io-client`
   - [ ] Создать `websocket.service.ts` (singleton)
   - [ ] Методы: connect, subscribe, unsubscribe, on, disconnect
   - [ ] Автоматический reconnect

7. **Types**
   - [ ] Создать типы для WebSocket events:
     - `GenerationProgressEvent` - generationId, status, processedUrls, totalUrls
     - `GenerationStatusEvent` - generationId, status, content?, errorMessage?, entriesCount?

---

### ⏳ Frontend - UI Components

8. **Главная страница (`/`)**
   - [ ] Создать `routes/+page.svelte`
   - [ ] Компоненты:
     - [ ] `GenerationsList.svelte` - список + пагинация
     - [ ] `GenerationListItem.svelte` - элемент (hostname, status, progress, date, delete)
     - [ ] `NewGenerationForm.svelte` - форма (hostname → analyze → provider select → create)
     - [ ] `ProgressBar.svelte` - переиспользуемый прогресс бар
   - [ ] WebSocket integration (subscribe к списку генераций)
   - [ ] Обработка real-time updates (progress, status)
   - [ ] Delete функционал

9. **Детальная страница (`/generations/[id]`)**
   - [ ] Создать `routes/generations/[id]/+page.svelte`
   - [ ] Компоненты:
     - [ ] `GenerationDetail.svelte` - основной компонент
     - [ ] Переиспользовать `ProgressBar.svelte`
     - [ ] Переиспользовать `ContentDisplay.svelte` (из текущего ResultDisplay)
   - [ ] WebSocket integration (subscribe к одной генерации)
   - [ ] Кнопки: Copy, Download, Delete
   - [ ] Обработка обновлений прогресса

10. **Пагинация**
    - [ ] Компонент `Pagination.svelte`
    - [ ] State: page, limit, total
    - [ ] UI: Previous/Next + выбор кол-ва элементов (5, 10, 20, 50)

---

### Тестирование

11. **Backend Tests**
    - [ ] WebSocket connection с аутентификацией
    - [ ] Subscribe/unsubscribe логика
    - [ ] Event emission из BullMQ → WebSocket
    - [ ] Delete с удалением из очереди

12. **Frontend Tests**
    - [ ] WebSocket reconnect при потере соединения
    - [ ] Обновление прогресса в real-time
    - [ ] Перезагрузка страницы (восстановление состояния)
    - [ ] Пагинация
    - [ ] Delete операция

13. **Integration Tests**
    - [ ] Создание генерации → появление в списке → обновления через WebSocket
    - [ ] Клик на генерацию → детальный вид → прогресс updates
    - [ ] Delete из списка → удаление из БД и очереди
    - [ ] Множество генераций одновременно

---

## Технические детали

### WebSocket Message Format

**Client → Server:**
- `subscribe` - подписка на обновления (generationIds: number[])
- `unsubscribe` - отписка (generationIds: number[])

**Server → Client:**
- `generation:progress` - обновление прогресса (generationId, status, processedUrls, totalUrls)
- `generation:status` - изменение статуса (generationId, status, content?, entriesCount?)
- `generation:deleted` - генерация удалена (generationId)

### BullMQ → WebSocket Flow

1. Job Handler (процесс батча) → EventEmitter.emit('generation.progress')
2. WebSocketGateway (слушает event) → socket.to(`generation-${id}`).emit('generation:progress')
3. Client (получает update)

### Progress Calculation

**Job Handler:**
- Считает totalUrls в начале через countTotalUrls()
- После каждого батча: processedUrls += batch.length
- Emit event с generationId, processedUrls, totalUrls, status

**Client при reload:**
- Загружает generation из БД (без прогресса)
- Если status = 'active': показывает "Processing..." без процентов
- При получении первого WebSocket update: показывает прогресс бар с процентами

---

## Приоритеты

1. **✅ P0 (Critical):** Backend WebSocket - ЗАВЕРШЕНО
2. **⏳ P0 (Critical):** Frontend WebSocket Client - В РАБОТЕ
3. **P1 (High):** Список генераций + real-time updates
4. **P2 (Medium):** Детальный вид + пагинация
5. **P3 (Low):** Polish + тесты

---

## Будущие доработки (не реализовывать сейчас)

### Stripe Payment Integration

**Контекст:**
В будущем генерация с провайдером "Быстро" (Gemini) станет платной через Stripe.

**Флоу оплаты:**

1. **Создание запроса на генерацию** (провайдер = Gemini):
   - Записать `GenerationRequest` в БД со статусом `PENDING_PAYMENT`
   - **НЕ** добавлять job в BullMQ очередь
   - Рассчитать цену на основе количества URLs:
     - Использовать `pricePerGeneration` из конфига провайдера (`apps/api/src/config/config.service.ts:71`)
     - Формула расчёта: TBD (пока не определена)
   - Создать payment session в Stripe
   - Сохранить `paymentLink` в `GenerationRequest`
   - Вернуть клиенту ответ с `paymentLink` и `generationId`

2. **Клиент получает ответ:**
   - UI показывает ссылку на оплату
   - Пользователь переходит на Stripe Checkout
   - После оплаты Stripe редиректит обратно на сайт

3. **Stripe Webhook** (после успешной оплаты):
   - Stripe вызывает настроенный webhook endpoint на нашем API
   - Webhook handler:
     - Верифицирует webhook signature
     - Находит `GenerationRequest` по `paymentSessionId`
     - Обновляет статус на `WAITING`
     - **Добавляет job в BullMQ очередь** (`queueService.addGenerationJob()`)
   - С этого момента генерация обрабатывается как обычно

4. **Real-time updates:**
   - После добавления в очередь генерация появляется в списке пользователя
   - WebSocket отправляет обновления прогресса как обычно

**Технические детали:**

- **Endpoint для webhook:** `POST /api/webhooks/stripe`
- **Новый статус:** `PENDING_PAYMENT` (между созданием запроса и постановкой в очередь)
- **Поля в GenerationRequest:**
  - `paymentLink: string | null`
  - `paymentSessionId: string | null`
  - `paymentStatus: 'pending' | 'completed' | 'failed' | null`
- **Расчёт цены:**
  - Input: `urlsCount` (из hostname analysis)
  - Output: `amount` в центах
  - Конфиг: `pricePerGeneration` уже существует в `PROVIDERS`
  - Формула: TBD

**Открытые вопросы:**

1. **Автопополнение баланса Gemini API:**
   - Стоит ли автоматически пополнять баланс Gemini на часть полученной оплаты?
   - Если да, то какой процент от оплаты направлять на пополнение?
   - Как реализовать автоматическое пополнение через Gemini API?

2. **Обработка неуспешных платежей:**
   - Что делать с `GenerationRequest` если платёж отменён/не прошёл?
   - Удалять из БД или помечать как `PAYMENT_FAILED`?

3. **Refunds:**
   - Если генерация failed после оплаты, делать ли автоматический refund?

4. **Тестирование:**
   - Использовать Stripe Test Mode для разработки
   - Webhook endpoint должен поддерживать как test, так и live webhooks

**Что учитывать при текущей разработке:**

- При создании UI для списка генераций предусмотреть отображение статуса `PENDING_PAYMENT`
- В `GenerationRequest` entity возможно потребуется добавить поля для payment
- WebSocket updates должны корректно обрабатывать переход `PENDING_PAYMENT` → `WAITING` → `ACTIVE`
- DELETE операция должна корректно обрабатывать генерации в статусе `PENDING_PAYMENT` (возможно с refund)

**Важные детали реализации:**

1. **Идемпотентность webhook:**
   - Stripe может отправить webhook несколько раз (retry logic)
   - Проверять `paymentStatus !== 'completed'` перед добавлением job в очередь
   - Или использовать Stripe event ID для дедупликации
   - Логировать все webhook calls для отладки

2. **Expiration неоплаченных запросов:**
   - Stripe payment sessions имеют TTL (~24 часа)
   - Создать cleanup job (cron) для удаления/архивации PENDING_PAYMENT старше 24 часов
   - Или помечать как PAYMENT_EXPIRED

3. **UX после redirect со Stripe:**
   - Создать страницу `/payment/success?generationId=123`
   - Показывать "Ожидаем подтверждения оплаты..."
   - Polling статуса или ожидание WebSocket update с переходом в WAITING
   - Обработать случай когда webhook пришёл раньше чем пользователь вернулся

4. **Metadata в Stripe session:**
   - Сохранять для отладки и support:
     - `userId` - ID пользователя
     - `generationId` - ID генерации
     - `hostname` - что генерируем
     - `urlsCount` - количество URLs
   - Metadata доступна в Stripe Dashboard

5. **Webhook security (расширенная проверка):**
   - Верификация signature (обязательно)
   - Проверка `event.type === 'checkout.session.completed'`
   - Проверка `payment_intent.status === 'succeeded'`
   - Проверка `amount_total` соответствует расчётной цене
   - Проверка `event.account` если multi-tenant

6. **Error handling в webhook:**
   - Если `addGenerationJob()` упадёт - Stripe будет retry (до 72 часов)
   - Логировать все ошибки с context (event ID, generation ID)
   - Создать admin endpoint для ручного запуска генерации по payment session ID
   - Алертинг при повторяющихся ошибках webhook

7. **Cancellation flow:**
   - Пользователь может закрыть Stripe Checkout без оплаты
   - Добавить кнопку "Cancel Payment" в UI для удаления PENDING_PAYMENT
   - Или автоматический cleanup через N часов (см. п.2)
   - Webhook `checkout.session.expired` для обработки истёкших sessions

8. **Формула цены (когда будет определена):**
   - Учесть минимум Stripe processing fee ($0.30 + 2.9%)
   - Минимальная цена генерации (например $0.50)
   - Варианты:
     - Фиксированная цена: `$1 за генерацию`
     - По количеству URLs: `$0.01 * urlsCount`
     - Tiered: `0-100 = $1`, `101-1000 = $5`, `1000+ = $10`
   - Округление: всегда вверх до центов
   - Показывать итоговую цену ДО перехода на Stripe Checkout

9. **Testing strategy:**
   - Использовать Stripe Test Mode с test cards
   - Mock webhook events для unit тестов
   - Test cases:
     - Успешная оплата
     - Отменённая оплата (cancel)
     - Истёкшая session
     - Duplicate webhook events (идемпотентность)
     - Webhook пришёл раньше чем user вернулся на сайт
     - Failed payment (declined card)

10. **Monitoring:**
    - Метрики: conversion rate (PENDING_PAYMENT → WAITING)
    - Количество expired/cancelled payments
    - Среднее время между созданием session и webhook
    - Алерты на failed webhooks
