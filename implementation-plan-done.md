# План имплементации: Выполненные задачи

**Дата:** 28 января 2026  
**Статус:** Завершено

---

## Этап 1: Подготовка инфраструктуры

### 1.2 Настройка CORS и Security

**API: `apps/api/src/bootstrap/main.ts`**

- [x] Настроить **CORS и Security**:
  - CORS: разрешить только домен UI (Fastify: `app.register(cors, { origin: UI_URL, credentials: true })`)
  - Security headers через Fastify Helmet или вручную
  - Session cookies: SameSite=Strict

- [x] Проверить существующую конфигурацию TypeORM в `config.module.ts`:
  - Подключение к MySQL
  - Настройка миграций
  - Auto-load entities из `modules/*/entities`

- [x] Проверить существующую конфигурацию Redis в `config.module.ts`:
  - Основное подключение для BullMQ
  - Подключение для кэша

- [x] Создать структуру модулей:
  ```
  modules/
    ├── orders/
    ├── users/
    ├── auth/
    ├── models/
    ├── content/
    ├── generation/
    ├── payments/
    └── stats/
  ```

---

## Этап 2: Модели данных (Model layer)

### 2.1 Создание TypeORM entities

**API: `apps/api/src/modules/users/entities/`**

- [x] **User entity** (`user.entity.ts`):
  ```typescript
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    email: string;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
    
    @OneToMany(() => Order, order => order.user)
    orders: Order[];
  }
  ```

**API: `apps/api/src/modules/orders/entities/`**

- [x] **Order entity** (`order.entity.ts`) - базовая структура создана

### 2.2 Создание миграций

- [x] Сгенерировать миграцию:
  ```bash
  npm run migration:generate -- -n InitialSchema
  ```

- [x] Проверить и применить миграцию:
  ```bash
  npm run migration:run
  ```

### 2.3 Enums

- [x] **OrderStatus enum** (уже существует `order-status.enum.ts` - дополнено)
- [x] **Currency enum** (уже существует `currency.enum.ts`)

---

## Этап 3: Конфигурация моделей (Model Configuration)

### 3.1 Система конфигурации моделей

- [x] Создать **ModelsConfigService** (`services/models-config.service.ts`):
  - Загрузка конфигурации моделей из `.env`
  - Парсинг JSON конфигурации
  - Валидация структуры конфигурации
  - Методы реализованы

- [x] Создать **DTO** (`dto/`):
  - ModelConfigDto
  - AvailableModelDto

- [x] Добавить конфигурацию в `.env`

---

## Этап 4: Аутентификация (Auth Module)

### 4.1 API: Magic Link Authentication

- [x] Создать **MailService** (`services/mail.service.ts`)
- [x] Создать **AuthService** (`services/auth.service.ts`)
- [x] Добавить поля в **User entity** (loginToken, loginTokenExpiresAt)
- [x] Создать **AuthController** (`controllers/auth.controller.ts`)
- [x] Создать **SessionGuard** (`guards/session.guard.ts`)
- [x] Настроить **@fastify/session** с TypeORM Session Store

---

## Этап 5: Orders API (Controller + Service)

### 5.1 API: Orders Module

- [x] Создать **OrderStatusMachine** (`utils/order-status-machine.ts`)
- [x] Создать **OrdersService** (`services/orders.service.ts`)
- [x] Создать **OrdersController** (`controllers/orders.controller.ts`) - базовая структура

### 5.2 API: Crawlers Service

- [x] Расширить **CrawlersService**:
  - `checkRobotsTxt(hostname: string): Promise<boolean>`
  - `checkSitemapXml(hostname: string): Promise<boolean>`
  - `getAllSitemapUrls(hostname: string): Promise<string[]>` - извлечение всех URLs

### 5.3 API: Content Extraction Service

- [x] Создать **ContentExtractionService** (`services/content-extraction.service.ts`)

---

## Этап 6: Payments Module (Stripe Integration)

### 6.1 API: Stripe Service

- [x] Создать **StripeService** (`services/stripe.service.ts`)
- [x] Создать **PaymentsController** (`controllers/payments.controller.ts`)
- [x] Создать **Webhook handler** для Stripe

---

## Этап 7: Generation Module (LLM Integration)

### 7.1 API: LLM Provider Services

- [x] Создать базовый **BaseLLMProviderService** (`services/base-llm-provider.service.ts`)
- [x] Создать **GeminiService** (`services/gemini.service.ts`)
- [x] Создать **OllamaService** (`services/ollama.service.ts`)
- [x] Создать **LLMProviderFactory** (`services/llm-provider-factory.service.ts`)

### 7.2 API: Cache Service

- [x] Создать **CacheService** (`services/cache.service.ts`)

### 7.3 API: Generation Job Handler

**API: `apps/api/src/modules/queue/handlers/generation-job.handler.ts`**

- [x] Создан **GenerationJobHandler** - **УПРОЩЕННАЯ ВЕРСИЯ**:
  - Обрабатывает задания генерации из очереди BullMQ
  - Загружает Order и конфигурацию модели
  - Получает список URLs из sitemap НА ЛЕТУ (без snapshot)
  - Обрабатывает страницы батчами согласно `model.batchSize`
  - Извлекает контент через `ContentExtractionService`
  - Проверяет Redis кэш по hash контента
  - Генерирует саммари через LLM провайдер при cache MISS
  - Обновляет прогресс через `job.updateProgress()`
  - Генерирует описание сайта
  - Форматирует llms.txt через `LlmsTxtFormatter`
  - Сохраняет результат в `Order.output`
  - Обновляет статус на COMPLETED или FAILED

**API: `apps/api/src/modules/generations/utils/llms-txt-formatter.ts`**

- [x] Создан **LlmsTxtFormatter**:
  - Статический метод `format(hostname, description, pages)`
  - Форматирует llms.txt в стандартном формате
  - Экспортирует интерфейс `PageSummary`

**API: `apps/api/src/modules/generations/generations.module.ts`**

- [x] Создан **GenerationsModule**:
  - Импортирует `ModelsModule`
  - Предоставляет `GeminiService`, `OllamaService`, `LLMProviderFactory`, `CacheService`
  - Экспортирует все сервисы для использования в других модулях

**API: `apps/api/src/modules/queue/queue.module.ts`**

- [x] Обновлен **QueueModule**:
  - Добавлен импорт `TypeOrmModule.forFeature([Order])`
  - Добавлены импорты: `OrdersModule`, `CrawlersModule`, `ContentModule`, `GenerationsModule`
  - Добавлен provider `GenerationJobHandler`
  - Экспортирует `GenerationJobHandler`

**API: `apps/api/src/cli/cli.module.ts`**

- [x] Обновлен **CliModule**:
  - Добавлен импорт `GenerationsModule`

**API: `apps/api/src/cli/commands/generation-worker.command.ts`**

- [x] Обновлен **GenerationWorkerCommand**:
  - Добавлена инжекция `GenerationJobHandler`
  - Удалены TODO комментарии
  - Метод `processJob()` вызывает `generationJobHandler.handle(job)`

**API: `apps/api/src/modules/generations/services/cache.service.ts`**

- [x] Обновлен **CacheService**:
  - Изменен тип `modelId` с `number` на `string` во всех методах

**Гарантии (PRD 9.3 — 100% успех или FAILED):**
- Если LLM API вернул ошибку на любой странице — ROLLBACK, Order.status = FAILED
- Order.output заполняется ТОЛЬКО при полном успехе всех страниц
- При FAILED: ошибка сохраняется в Order.errors как массив `[{ message: string }]`
- BullMQ автоматически повторит job до 3 раз с экспоненциальной задержкой

---

## Этап 8: Queue Module (BullMQ Integration)

### 8.1 API: Queue Configuration

**API: `apps/api/src/modules/queue/`**

> **ВАЖНО:** Worker НЕ запускается вместе с основным приложением.  
> Worker запускается **отдельной CLI командой** для возможности масштабирования и независимого деплоя.

- [x] Настроены **BullMQ очереди динамически из конфигурации моделей**:
  - Имя очереди берётся из `model.queueName`
  - Тип очереди (`local`/`cloud`) берётся из `model.queueType`
  - Имена очередей определяются в MODELS_CONFIG

- [x] Создан **QueueService** (`services/queue.service.ts`):
  - `addOrderToQueue(orderId: number, queueName: string): Promise<string>` - возврат jobId
  - `getQueuePosition(queueName: string, jobId: string): Promise<number | null>` — позиция из BullMQ
  - `removeJob(jobId: string): Promise<void>` - удаление задания
  - `createWorker(queueName: string, handler: (job: Job) => Promise<void>): Worker` — фабрика worker-ов
  - Динамическая инициализация очередей из `ModelsConfigService.getUniqueQueueNames()`
  - OnModuleInit/OnModuleDestroy lifecycle hooks
  
  **Настройки повторов (PRD 9.4):**
  ```typescript
  attempts: 3,  // Максимум 3 попытки
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 10s, 20s
  }
  ```

- [x] Обновлен **QueueModule** (`queue.module.ts`):
  - Импортирует ModelsModule, OrdersModule, CrawlersModule, ContentModule, GenerationsModule
  - Импортирует TypeOrmModule.forFeature([Order])
  - Провайдеры: QueueService, GenerationJobHandler
  - Экспортирует QueueService и GenerationJobHandler

### 8.2 CLI: Generation Worker Command

**API: `apps/api/src/cli/commands/generation-worker.command.ts`**

- [x] Создан **bootstrap/cli.ts**:
  - Entry point для CLI приложения
  - Использует CommandFactory из nest-commander
  - Winston logger integration

- [x] Создан **CliModule** (`cli/cli.module.ts`):
  - Импорт всех необходимых модулей (Queue, Orders, Models, Content, Crawlers, Generations)
  - TypeORM и EventEmitter настройка
  - Provider: GenerationWorkerCommand

- [x] Создан **GenerationWorkerCommand**:
  - Декоратор `@Command({ name: 'generation-worker:start' })`
  - Получение уникальных очередей из ModelsConfigService
  - Создание worker для каждой очереди через QueueService.createWorker()
  - Graceful shutdown (SIGTERM/SIGINT) с таймаутом 10 секунд
  - Обработка jobs через GenerationJobHandler.handle()

- [x] NPM scripts существуют в package.json:
  - `generation-worker`: запуск production worker
  - `generation-worker:dev`: запуск с hot-reload

**Запуск:**
```bash
# Production (после npm run build)
npm run generation-worker

# Development (с hot-reload)
npm run generation-worker:dev
```

---

## Этап 5: Orders API (Controller + Service)

### 5.1 API: Orders Module - ОБНОВЛЕНО

**API: `apps/api/src/modules/orders/controllers/orders.controller.ts`**

- [x] Обновлен **OrdersController.createOrder()** - **УПРОЩЕННАЯ ВЕРСИЯ**:
  - Проверка robots.txt и sitemap.xml через `CrawlersService`
  - Подсчет URLs (БЕЗ извлечения контента!)
  - Создание Order с totalUrls
  - Расчет доступных моделей по totalUrls
  - Возврат `OrderResponseDto` с массивом `availableModels`

**API: `apps/api/src/modules/orders/services/orders.service.ts`**

- [x] Упрощен **OrdersService**:
  - Удалена зависимость от `SnapshotService`
  - Добавлен `ClsService` для получения `userId`
  - `createOrder()` только считает URLs из sitemap
  - `startOrder()` валидирует аутентификацию для платных моделей
  - Удалены relations `snapshotUrls` из всех запросов

**API: `apps/api/src/modules/orders/dto/order-response.dto.ts`**

- [x] Создан **OrderAvailableModelDto**:
  - Публичный DTO для API ответа
  - Скрывает внутренние поля: `serviceClass`, `modelName`, `queueName`, `queueType`, `batchSize`, `options`, `enabled`
  - Поля `price` и `totalPrice` - числа (не строки)
  - Добавлено свойство `availableModels: OrderAvailableModelDto[]` в `OrderResponseDto`
  - Метод `fromEntity()` принимает массив `availableModels` с дефолтом `[]`

**API: `apps/api/src/modules/models/dto/available-model.dto.ts`**

- [x] Обновлен **AvailableModelDto**:
  - `price` и `totalPrice` изменены с `string` на `number`
  - Удален параметр `currencySymbol` из конструктора и `fromModelConfig()`
  - Форматирование цены оставлено клиенту

**API: `apps/api/src/modules/models/services/models-config.service.ts`**

- [x] Упрощен **ModelsConfigService.getAvailableModels()**:
  - Использует `AvailableModelDto.fromModelConfig()`
  - Не передает `currencySymbol`

**API: `apps/api/src/modules/orders/orders.module.ts`**

- [x] Добавлен `ModelsModule` в imports

**Ключевые архитектурные решения:**
- Snapshot не создается - контент извлекается на лету в воркере
- Валидация аутентификации в `OrdersService.startOrder()` через `ClsService`
- Публичный API не раскрывает `apiKey` и внутреннюю конфигурацию
- Валидаторы robots.txt/sitemap работают через декораторы в DTO
- Цены возвращаются как числа для форматирования на клиенте

---

## Этап 6: Payments Module - Расширения

### 6.1 Stripe Payment Enums и статусы

- [x] Создан **StripeSessionStatus enum** (`enums/stripe-session-status.enum.ts`):
  - COMPLETE = 'complete'
  - OPEN = 'open'
  - EXPIRED = 'expired'

- [x] Расширен **StripeService**:
  - `checkSessionStatus(sessionId)` - проверка статуса Checkout Session
  - `checkPaymentIntentStatus(clientSecret)` - проверка статуса Payment Intent
  - Маппинг Stripe статусов в StripeSessionStatus enum

### 6.2 Stripe Configuration

- [x] Добавлены переменные окружения в `.env.example`:
  - `STRIPE_MIN_PAYMENT=0.50` - минимальная сумма платежа
  - `STRIPE_CURRENCY=eur` - валюта платежей

- [x] Обновлен **ConfigService** (`config/config.service.ts`):
  - Добавлена валидация `STRIPE_CURRENCY` через Joi против значений Currency enum
  - stripe объект: `{ secretKey, publishableKey, webhookSecret, minPayment, currency }`
  - modelsConfig использует `Currency[env.STRIPE_CURRENCY.toUpperCase() as keyof typeof Currency]`

### 6.3 Payment Business Logic

- [x] Обновлен **OrdersService** (`services/orders.service.ts`):
  - Добавлена зависимость от `AppConfigService`
  - `calculateOrder()`:
    - Использует `configService.stripe.currency` вместо hardcoded EUR
    - Автоматическое увеличение цены до `STRIPE_MIN_PAYMENT` если меньше минимума
  - `ensureOrderPayable()`:
    - Принимает статусы CALCULATED и PENDING_PAYMENT
    - Автоматический переход CALCULATED → PENDING_PAYMENT для платных заказов
    - Проверка что бесплатные заказы не требуют оплаты
  - `getOrCreateCheckoutSession()`:
    - Проверка существующего stripeSessionId через Stripe API
    - Возврат существующей сессии если статус OPEN
    - Создание новой сессии при отсутствии или истечении
  - `getOrCreatePaymentIntent()`:
    - Аналогичная логика для Payment Intent
    - Проверка и переиспользование активных интентов
  - `queueOrder()`:
    - Использует `configService.stripe.currency`

- [x] Централизация валюты:
  - Все Currency.EUR заменены на `configService.stripe.currency`
  - `OrderAvailableAiModelDto.fromAvailableModel()` использует `CURRENCY_SYMBOLS[model.currency]`
  - Единая точка управления валютой через STRIPE_CURRENCY

### 6.4 HATEOAS Implementation

- [x] Обновлен **OrderResponseDto** (`dto/order-response.dto.ts`):
  - Добавлен интерфейс `HateoasLink: { href, method?, description? }`
  - Добавлено поле `_links: Record<string, HateoasLink>`
  - Создана функция `buildOrderLinks(entity: Order)` для контекстных ссылок
  - Ссылки зависят от статуса заказа:
    - CREATED → calculate
    - CALCULATED (free) → run
    - CALCULATED (paid) → checkout, paymentIntent
    - PENDING_PAYMENT → run, checkout, paymentIntent
    - PAID → run
    - QUEUED/PROCESSING → self only
    - COMPLETED → self, download
    - FAILED → self, refund
    - PAYMENT_FAILED → self, checkout, paymentIntent

- [x] Созданы **Payment Response DTOs** (`modules/payments/dto/payment-response.dto.ts`):
  - `CheckoutSessionResponseDto` - с sessionId, orderId, _links
  - `PaymentIntentResponseDto` - с clientSecret, orderId, _links
  - `buildPaymentLinks()` - создает HATEOAS-ссылки для платежных ответов
  - Ссылки: self (заказ), run (запуск), альтернативный метод оплаты

- [x] Обновлен **PaymentsController**:
  - Импорт новых DTOs
  - `createCheckoutSession()` возвращает `CheckoutSessionResponseDto`
  - `createPaymentIntent()` возвращает `PaymentIntentResponseDto`

### 6.5 Shared Exports

- [x] Создан **shared.ts** (`src/shared.ts`):
  - Экспорт всех необходимых типов для использования в UI
  - Enums: Currency, OrderStatus, ResponseCode, StripeSessionStatus
  - Response utilities: ApiResponse, MessageSuccess/Error/Invalid, Types
  - DTOs: Auth, Orders, Payments, AI Models
  - Entities: Order

---

## Архитектурные улучшения

### Worker Context (ClsModule)

- [x] Обновлен **CliModule** (`cli/cli.module.ts`):
  - Добавлен `ClsModule.forRoot({ global: true })`
  - Решена проблема с недоступностью CLS в worker процессах

### Payment Session Reuse

- [x] Логика предотвращения дубликатов платежных сессий:
  - Проверка существующих через Stripe API
  - Переиспользование активных (OPEN) сессий
  - Создание новых только при необходимости
  - Улучшение UX и предотвращение rate limiting от Stripe

### Service Layer Pattern

- [x] Рефакторинг логики платежей:
  - Вся бизнес-логика в OrdersService
  - PaymentsController - тонкая прокладка для HTTP
  - Соблюдение принципа единственной ответственности

### Currency Management

- [x] Централизованное управление валютой:
  - STRIPE_CURRENCY как единая точка правды
  - Joi валидация против Currency enum
  - Устранение hardcoded Currency.EUR по всему коду
  - Поддержка множественных валют через конфигурацию

### Minimum Payment Enforcement

- [x] Автоматическое соблюдение минимумов Stripe:
  - Проверка в calculateOrder()
  - Автоматическое увеличение до STRIPE_MIN_PAYMENT
  - Предотвращение ошибок при создании платежей

---

## Этап 9: WebSocket Module (Real-time Updates)

### 9.1 API: WebSocket Gateway

**API: `apps/api/src/modules/websocket/`**

- [x] Создан **WebSocketService** (`services/websocket.service.ts`):
  - Управление подписками клиентов через Map<string, Set<WebSocket>>
  - `subscribe(orderId, client)` - подписка на обновления заказа
  - `subscribeToStats(client)` - подписка на статистику
  - `sendQueuePosition()` - отправка позиции в очереди
  - `sendProgress()` - отправка прогресса обработки
  - `sendCompletion()` - отправка финального статуса
  - `broadcastStatsUpdate()` - broadcast обновлений статистики
  - `removeClient()` - очистка при отключении

- [x] Создан **WebSocketGateway** (`gateways/websocket.gateway.ts`):
  - Использует OnModuleInit для регистрации через Fastify
  - Endpoints: `/ws/orders`, `/ws/stats`
  - **Аутентификация через сессии**:
    - `extractSession()` - извлечение sessionId из cookie
    - `parseCookie()` - парсинг подписанных cookies ('s:' prefix)
    - `checkOrderAccess()` - проверка владения заказом (userId OR sessionId)
    - Закрытие соединения при отсутствии валидной сессии
    - Отправка ошибки при попытке подписки на чужой заказ
  - Обработка сообщений через отдельный метод `handleOrderMessage()`
  - WebSocket message format: `{ event: string, data: any }`

- [x] Создан **WebSocketModule** (`websocket.module.ts`):
  - Imports: TypeORM.forFeature([Session, Order]), StatsModule
  - Providers: WebSocketService, WebSocketGateway
  - Exports: WebSocketService

- [x] Созданы **WebSocket Events** (`websocket.events.ts`):
  - Классы (не интерфейсы) для десериализации на клиенте:
    - `OrderQueueEvent` - позиция в очереди
    - `OrderProgressEvent` - прогресс обработки (с percentage)
    - `OrderCompletionEvent` - финальный статус
    - `StatsUpdateEvent` - обновление статистики
    - `SubscriptionAckEvent` - подтверждение подписки
    - `WebSocketMessage<T>` - обертка для сообщений
  - Экспортированы через `shared.ts` для использования в UI

- [x] Интеграция с **OrderJobHandler**:
  - Инжектирован WebSocketService и StatsService
  - `sendProgress()` после каждого батча страниц
  - `sendProgress()` при генерации description
  - `sendCompletion()` при успехе/ошибке
  - `broadcastStatsUpdate()` при завершении заказа

- [x] Обновлены модули:
  - `app.module.ts` - добавлен WebSocketModule
  - `queue.module.ts` - добавлены WebSocketModule и StatsModule

**Безопасность:**
- ✅ Проверка сессии при подключении
- ✅ Проверка владения заказом перед подпиской
- ✅ Поддержка как авторизованных (userId), так и анонимных (sessionId) пользователей
- ✅ Логирование несанкционированных попыток доступа
- ✅ Stats endpoint публичный (без авторизации)

---

## Этап 10: Statistics Module

### 10.1 API: Stats Service

**API: `apps/api/src/modules/stats/`**

- [x] Создан **StatsService** (`services/stats.service.ts`):
  - `getCompletedCount()` - COUNT Orders WHERE status = COMPLETED
  - `getStats()` - агрегированная статистика `{ completed: number }`

- [x] Создан **StatsController** (`controllers/stats.controller.ts`):
  - `GET /api/stats/completed` - возвращает `{ count: number }`
  - `GET /api/stats` - возвращает `{ completed: number }`

- [x] Создан **StatsModule** (`stats.module.ts`):
  - Imports: TypeORM.forFeature([Order])
  - Providers: StatsService
  - Controllers: StatsController
  - Exports: StatsService

- [x] Интеграция с WebSocket:
  - StatsService импортирован в WebSocketModule
  - `broadcastStatsUpdate()` вызывается при завершении заказов
  - Real-time обновление статистики для всех подписчиков `/ws/stats`

---

