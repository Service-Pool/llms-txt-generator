# План имплементации: LLMs.txt Generator на основании PRD-ru.md

**Дата:** 28 января 2026  
**Архитектурный подход:** MVC (Model-View-Controller)  
**Базовая структура:** Новое приложение в `apps/api` и `apps/ui` (используя подход из `apps/_api` и `apps/_ui` как референс)

---

## Общие принципы

### Полный ООП подход

> **ВАЖНО:** В проекте используется полноценный объектно-ориентированный подход:
> - **Классы вместо интерфейсов ради интерфейсов** — если нужна типизация, создаётся класс/абстрактный класс
> - **Наследование через `extends`** — конкретные классы наследуют абстрактные (например, `GeminiService extends BaseLLMProviderService`)
> - **Интерфейсы только там, где реально нужен контракт** — для DI, внешних API, или когда класс должен реализовать несколько контрактов (`implements`)
> - **Никаких `IService` паттернов** — не создаём `IOrdersService` для каждого `OrdersService`
> - **DTO — это классы с методами** — для обмена данными с UI используются shared DTO классы с методами конвертации `fromEntity()` и `toEntity()`

**Пример DTO с методами конвертации:**
```typescript
// apps/api/src/modules/orders/dto/order.dto.ts
export class OrderDto {
  id: number;
  hostname: string;
  status: OrderStatus;
  createdAt: Date;
  
  // Статический метод: Entity → DTO
  static fromEntity(entity: Order): OrderDto {
    const dto = new OrderDto();
    dto.id = entity.id;
    dto.hostname = entity.hostname;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    return dto;
  }
  
  // Метод экземпляра: DTO → Entity (для создания/обновления)
  toEntity(): Partial<Order> {
    return {
      hostname: this.hostname,
      status: this.status,
    };
  }
}
```

### Архитектура MVC
- **Model:** TypeORM entities + миграции в `apps/api/src/migrations`
- **Controller:** NestJS контроллеры в `apps/api/src/modules/*/controllers`
- **Service:** Бизнес-логика в `apps/api/src/modules/*/services`
- **View:** SvelteKit компоненты в `apps/ui/src/routes` и `apps/ui/src/lib`

### Структура модулей API

**Шаблон модуля:**
```
apps/api/src/modules/{module-name}/
  ├── {module}.module.ts          # NestJS Module (DI конфигурация)
  ├── controllers/
  │   └── {module}.controller.ts
  ├── services/
  │   └── {module}.service.ts
  ├── entities/
  │   └── {entity}.entity.ts
  ├── dto/
  │   ├── {action}.dto.ts
  │   └── {response}.dto.ts
  ├── guards/                      # (опционально)
  │   └── {guard}.guard.ts
  └── utils/                       # (опционально)
      └── {utility}.ts
```

**Полная структура `apps/api/src`:**
```
apps/api/
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── bootstrap/
    │   ├── main.ts                    # HTTP server entry point
    │   ├── cli.ts                     # CLI entry point
    │   └── app.module.ts              # Root module
    │
    ├── cli/
    │   ├── cli.module.ts
    │   └── commands/
    │       └── generation-worker.command.ts
    │
    ├── config/
    │   ├── config.module.ts
    │   ├── config.service.ts          # Централизованная конфигурация
    │   └── config.logger.ts           # Winston logger setup
    │
    ├── enums/
    │   ├── order-status.enum.ts       # CREATED, PENDING_PAYMENT, PAID, etc.
    │   ├── currency.enum.ts           # USD, EUR
    │   └── provider.enum.ts           # GEMINI, OLLAMA
    │
    ├── exceptions/
    │   └── validation.exception.ts
    │
    ├── filters/
    │   └── global-exception.filter.ts
    │
    ├── migrations/
    │   └── {timestamp}-migration.ts   # TypeORM migrations
    │
    └── modules/
        │
        ├── auth/
        │   ├── auth.module.ts
        │   ├── controllers/
        │   │   └── auth.controller.ts
        │   ├── services/
        │   │   ├── auth.service.ts
        │   │   └── mail.service.ts
        │   ├── guards/
        │   │   └── session.guard.ts
        │   └── dto/
        │       ├── request-login-link.dto.ts
        │       └── verify-login-link.dto.ts
        │
        ├── users/
        │   ├── users.module.ts
        │   ├── entities/
        │   │   └── user.entity.ts
        │   └── services/
        │       └── users.service.ts
        │
        ├── orders/
        │   ├── orders.module.ts
        │   ├── controllers/
        │   │   └── orders.controller.ts
        │   ├── services/
        │   │   └── orders.service.ts
        │   ├── entities/
        │   │   └── order.entity.ts
        │   ├── dto/
        │   │   ├── create-order.dto.ts
        │   │   ├── start-order.dto.ts
        │   │   └── order.dto.ts
        │   └── utils/
        │       └── order-status-machine.ts
        │
        ├── models/
        │   ├── models.module.ts
        │   ├── services/
        │   │   └── models-config.service.ts
        │   └── dto/
        │       ├── model-config.dto.ts
        │       └── available-model.dto.ts
        │
        ├── content/
        │   ├── content.module.ts
        │   ├── services/
        │   │   ├── content-extraction.service.ts
        │   │   ├── content-store.service.ts
        │   │   └── snapshot.service.ts
        │   └── entities/
        │       ├── snapshot-url.entity.ts
        │       └── content-store.entity.ts
        │
        ├── crawlers/
        │   ├── crawlers.module.ts
        │   └── services/
        │       └── crawlers.service.ts
        │
        ├── generations/
        │   ├── generations.module.ts
        │   ├── services/
        │   │   ├── base-llm-provider.service.ts  # Abstract class
        │   │   ├── gemini.service.ts              # extends Base
        │   │   ├── ollama.service.ts              # extends Base
        │   │   ├── llm-provider-factory.service.ts
        │   │   └── cache.service.ts
        │   └── utils/
        │       └── llms-txt-formatter.ts
        │
        ├── queue/
        │   ├── queue.module.ts
        │   ├── services/
        │   │   └── queue.service.ts
        │   └── handlers/
        │       └── generation-job.handler.ts
        │
        ├── payments/
        │   ├── payments.module.ts
        │   ├── controllers/
        │   │   └── payments.controller.ts
        │   ├── services/
        │   │   └── stripe.service.ts
        │   └── dto/
        │       ├── create-checkout.dto.ts
        │       └── create-payment-intent.dto.ts
        │
        ├── websocket/
        │   ├── websocket.module.ts
        │   ├── controllers/
        │   │   └── websocket.controller.ts
        │   └── services/
        │       └── websocket.service.ts
        │
        ├── stats/
        │   ├── stats.module.ts
        │   ├── controllers/
        │   │   └── stats.controller.ts
        │   └── services/
        │       └── stats.service.ts
        │
        └── http/
            ├── http.module.ts
            └── guards/
                └── rate-limit.guard.ts
```

**Ключевые папки:**

- **`bootstrap/`** — точки входа приложения (HTTP server, CLI)
- **`config/`** — централизованная конфигурация (env, логгер)
- **`enums/`** — shared enums для всего приложения
- **`migrations/`** — TypeORM database migrations
- **`modules/`** — domain-oriented feature modules
- **`exceptions/`** и **`filters/`** — глобальная обработка ошибок

### Структура UI
```
apps/ui/src/
  ├── routes/
  │   ├── +page.svelte          (главная)
  │   ├── auth/
  │   ├── orders/
  │   └── history/
  └── lib/
      ├── components/
      ├── services/
      └── stores/
```

---

## Этап 1: Подготовка инфраструктуры

### 1.1 Проверка существующих зависимостей

> **ВАЖНО:** Мы переписываем существующее приложение `apps/_api` → `apps/api`, а не создаём новое.  
> Все необходимые зависимости уже установлены в `apps/_api/package.json`.

**Существующие зависимости в проекте (уже установлены):**

| Категория | Пакеты |
|-----------|--------|
| **NestJS Core** | `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/axios` |
| **Database** | `@nestjs/typeorm`, `typeorm`, `mysql2` |
| **Queue** | `bullmq`, `ioredis` |
| **HTTP** | `@nestjs/platform-fastify`, `@fastify/cookie`, `@fastify/session`, `@fastify/websocket` |
| **Payments** | `stripe` |
| **LLM Providers** | `@google/genai` (Gemini), `ollama` |
| **Content Parsing** | `cheerio`, `@mozilla/readability`, `jsdom`, `robots-parser`, `sitemapper` |
| **Email** | `nodemailer` |
| **Validation** | `class-validator`, `class-transformer`, `joi`, `zod` |
| **Logging** | `nest-winston`, `winston`, `winston-daily-rotate-file` |
| **Other** | `@nestjs/schedule`, `@nestjs/event-emitter`, `nestjs-cls`, `bcrypt`, `axios`, `axios-retry` |

**При необходимости добавить (если не хватает):**
```bash
cd apps/api
npm install helmet  # Security headers (если нужен, Fastify имеет свои)
```

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

**UI: `apps/ui`**

> UI также переписывается из `apps/_ui`. Большинство зависимостей уже установлены.

**Существующие зависимости в UI:**
- `@stripe/stripe-js` — Stripe интеграция
- `flowbite-svelte` — UI компоненты
- `tailwindcss` — стили

**При необходимости добавить:**
```bash
cd apps/ui
npm install dayjs  # Работа с датами (если нужен)
# WebSocket: использовать нативный WebSocket API браузера (Fastify WS совместим)
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

- [x] **Order entity** (`order.entity.ts`):
  ```typescript
  @Entity('orders')
  export class Order {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ nullable: true })
    userId: number;
    
    @Column({ nullable: true })
    sessionId: string;
    
    @Column()
    hostname: string;
    
    @Column({ nullable: true })
    modelId: string;
    
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    priceTotal: number;
    
    @Column({ type: 'enum', enum: Currency, nullable: true })
    priceCurrency: Currency;
    
    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    pricePerUrl: number;
    
    @Column({ nullable: true })
    stripeSessionId: string;
    
    @Column({ nullable: true })
    stripePaymentIntentSecret: string;
    
    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.CREATED })
    status: OrderStatus;
    
    @Column({ nullable: true })
    jobId: string;
    
    @Column({ type: 'datetime', nullable: true })
    startedAt: Date;
    
    @Column({ type: 'datetime', nullable: true })
    completedAt: Date;
    
    @Column({ type: 'text', nullable: true })
    output: string;
    
    @Column({ nullable: true })
    llmsEntriesCount: number;
    
    @Column({ type: 'text', nullable: true })
    errors: string;
    
    @Column({ nullable: true })
    totalUrls: number;
    
    @Column({ default: 0 })
    processedUrls: number;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
    
    @ManyToOne(() => User, user => user.orders)
    @JoinColumn({ name: 'userId' })
    user: User;
    
    @OneToMany(() => SnapshotUrl, snapshot => snapshot.order)
    snapshotUrls: SnapshotUrl[];
  }
  ```

**API: `apps/api/src/modules/content/entities/`**

- [x] **SnapshotUrl entity** (`snapshot-url.entity.ts`):
  ```typescript
  @Entity('snapshot_urls')
  export class SnapshotUrl {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    orderId: number;
    
    @Column({ type: 'text' })
    url: string;
    
    @Column()
    title: string;
    
    @Column()
    contentHash: string;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @ManyToOne(() => Order, order => order.snapshotUrls)
    @JoinColumn({ name: 'orderId' })
    order: Order;
  }
  ```

- [x] **ContentStore entity** (`content-store.entity.ts`):
  ```typescript
  @Entity('content_store')
  export class ContentStore {
    @PrimaryColumn()
    contentHash: string;
    
    @Column({ type: 'longtext' })
    rawContent: string;
    
    @Column({ default: 0 })
    refCount: number;
    
    @CreateDateColumn()
    firstSeenAt: Date;
    
    @Column({ type: 'datetime' })
    lastAccessedAt: Date;
  }
  ```

### 2.2 Создание миграций

**API: `apps/api/src/migrations/`**

- [x] Сгенерировать миграцию:
  ```bash
  npm run migration:generate -- -n InitialSchema
  ```

- [x] Проверить и применить миграцию:
  ```bash
  npm run migration:run
  ```

### 2.3 Enums

**API: `apps/api/src/enums/`**

- [x] **OrderStatus enum** (уже существует `order-status.enum.ts` - дополнено):
  ```typescript
  export enum OrderStatus {
    CREATED = 'created',
    PENDING_PAYMENT = 'pending_payment',
    PAID = 'paid',
    PAYMENT_FAILED = 'payment_failed',
    QUEUED = 'queued',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
  }
  ```

- [x] **Currency enum** (уже существует `currency.enum.ts`)

---

## Этап 3: Конфигурация моделей (Model Configuration)

### 3.1 Система конфигурации моделей

**API: `apps/api/src/modules/models/`**

- [x] Создать **ModelsConfigService** (`services/models-config.service.ts`):
  - Загрузка конфигурации моделей из `.env`
  - Парсинг JSON конфигурации
  - Валидация структуры конфигурации
  - Методы:
    - `getAllModels(): ModelConfig[]`
    - `getModelById(id: string): ModelConfig`
    - `getAvailableModels(totalUrls: number, isAuthenticated: boolean): AvailableModelDto[]`
    - `calculatePrice(modelId: string, totalUrls: number): number`

- [x] Создать **DTO** (`dto/`):
  ```typescript
  // model-config.dto.ts
  export class ModelConfigDto {
    id: string;
    category: string;
    displayName: string;
    description: string;
    serviceClass: string;
    modelName: string;
    baseRate: number;
    pageLimit: number | false;
    queueName: string;
    queueType: 'local' | 'cloud';
    batchSize: number;
  }
  
  // available-model.dto.ts
  export class AvailableModelDto extends ModelConfigDto {
    price: string;
    totalPrice: string;
    available: boolean;
    unavailableReason: string | null;
  }
  ```

- [x] Добавить конфигурацию в `.env`:
  ```env
  MODELS_CONFIG=[{"id":"llama3-local","category":"Fast",...}]
  ```

---

## Этап 4: Аутентификация (Auth Module)

### 4.1 API: Magic Link Authentication

**API: `apps/api/src/modules/auth/`**

**Референс:** Адаптировать реализацию из `apps/_api/src/modules/auth/services/`

- [x] Создать **MailService** (`services/mail.service.ts`) — адаптировать из `apps/_api`:
  - Использовать nodemailer с SMTP конфигурацией
  - `sendLoginLink(email: string, encryptedQuery: string): Promise<void>`
  - HTML шаблон письма с кнопкой входа
  - Конфигурация: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

- [x] Создать **AuthService** (`services/auth.service.ts`) — адаптировать из `apps/_api`:
  - `requestLoginLink(email: string, redirectUrl?: string): Promise<void>`
    - Генерация токена: `crypto.randomBytes(32).toString('hex')`
    - Сохранение в User: `loginToken`, `loginTokenExpiresAt`
    - Шифрование query через AES-256-CBC
    - Вызов MailService.sendLoginLink()
  - `verifyLoginLink(token: string): Promise<User>` - валидация токена, очистка после использования
  - `getOrCreateUser(email: string): Promise<User>` - создание/получение User
  - `transferSessionOrders(sessionId: string, userId: number): Promise<void>` - перенос Orders
  - `decryptAES(data: string): string` - расшифровка query

- [x] Добавить поля в **User entity**:
  ```typescript
  @Column({ nullable: true })
  loginToken: string | null;
  
  @Column({ type: 'datetime', nullable: true })
  loginTokenExpiresAt: Date | null;
  ```

- [x] Создать **AuthController** (`controllers/auth.controller.ts`):
  ```typescript
  @Controller('api/auth')
  export class AuthController {
    @Post('request-login-link')
    async requestLoginLink(@Body() dto: RequestLoginLinkDto) {}
    
    @Get('verify-login-link')
    async verifyLoginLink(@Query('token') token: string, @Res() res) {}
    
    @Post('logout')
    async logout(@Session() session) {}
    
    @Get('me')
    async getCurrentUser(@Session() session) {}
  }
  ```

- [x] Создать **SessionGuard** (`guards/session.guard.ts`):
  - Проверка авторизации через session
  - Извлечение userId или sessionId

- [x] Настроить **@fastify/session**:
  - Хранение сессий в **БД MySQL** через TypeORM (entity `Session`)
  - Создать TypeORM Session Store для @fastify/session
  - HTTP-only cookies
  - Secure флаги (httpOnly: true, sameSite: 'strict')

### 4.2 UI: Auth Pages

**UI: `apps/ui/src/routes/auth/`**

- [ ] Создать страницу логина (`login/+page.svelte`):
  - Форма ввода email
  - Вызов `POST /api/auth/request-login-link`
  - Сообщение "Проверьте почту"

- [ ] Создать страницу верификации (`verify/+page.svelte`):
  - Обработка query параметра `?token=...`
  - Вызов `GET /api/auth/verify-login-link?token=...`
  - Редирект на главную или страницу Order

- [ ] Создать auth store (`lib/stores/auth.store.ts`):
  ```typescript
  export const authStore = writable<User | null>(null);
  export const isAuthenticated = derived(authStore, $auth => !!$auth);
  ```

---

## Этап 5: Orders API (Controller + Service)

### 5.1 API: Orders Module

**API: `apps/api/src/modules/orders/`**

- [x] Создать **OrderStatusMachine** (`utils/order-status-machine.ts`):
  ```typescript
  // Валидация переходов статусов согласно PRD 6.2
  export class OrderStatusMachine {
    private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.CREATED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.QUEUED],
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.QUEUED],
      [OrderStatus.QUEUED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.FAILED, OrderStatus.CANCELLED],
      [OrderStatus.FAILED]: [OrderStatus.REFUNDED],
      // Терминальные статусы
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.PAYMENT_FAILED]: [],
    };
    
    static canTransition(from: OrderStatus, to: OrderStatus): boolean {
      return this.ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
    }
    
    static validateTransition(from: OrderStatus, to: OrderStatus): void {
      if (!this.canTransition(from, to)) {
        throw new BadRequestException(`Invalid status transition: ${from} -> ${to}`);
      }
    }
  }
  ```

- [x] Создать **OrdersService** (`services/orders.service.ts`):
  - `createOrder(hostname: string, sessionId: string, userId?: number): Promise<Order>`
  - `getOrderById(id: number, sessionId: string, userId?: number): Promise<Order>`
  - `getUserOrders(sessionId: string, userId?: number): Promise<Order[]>`
  - `startOrder(orderId: number, modelId: string): Promise<Order>`
  - `updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order>`
    - **ВАЖНО:** Использовать `OrderStatusMachine.validateTransition()` перед изменением
    - Выбрасывать ошибку при невалидном переходе
  - `updateProgress(orderId: number, processedUrls: number): Promise<void>`

- [x] Создать **OrdersController** (`controllers/orders.controller.ts`):
  ```typescript
  @Controller('api/orders')
  export class OrdersController {
    @Post()
    @UseGuards(RateLimitGuard)
    async createOrder(@Body() dto: CreateOrderDto, @Session() session) {
      // 1. Проверка robots.txt и sitemap.xml
      // 2. Создание Order
      // 3. Парсинг sitemap + извлечение контента
      // 4. Создание снапшота
      // 5. Расчет доступных моделей
      // 6. Возврат Order + availableModels
    }
    
    @Post(':id/start')
    async startOrder(@Param('id') id: number, @Body() dto: StartOrderDto, @Session() session) {
      // 1. Проверка владения Order
      // 2. Проверка статуса (должен быть CREATED)
      // 3. Фиксация модели и цены
      // 4. Если бесплатная → QUEUED, если платная → PENDING_PAYMENT
    }
    
    @Get()
    async getOrders(@Session() session) {
      // 1. Получение списка Orders
      // 2. Для Orders в PENDING_PAYMENT - polling Stripe
      // 3. Возврат списка
    }
    
    @Get(':id')
    async getOrder(@Param('id') id: number, @Session() session) {}
    
    @Get(':id/download')
    async downloadLlmsTxt(@Param('id') id: number, @Session() session, @Res() res) {
      // Генерация файла на лету из Order.output
    }
  }
  ```

### 5.2 API: Crawlers Service

**API: `apps/api/src/modules/crawlers/` (создать новый, используя подход из `apps/_api`)**

- [x] Расширить **CrawlersService**:
  - `checkRobotsTxt(hostname: string): Promise<boolean>`
  - `checkSitemapXml(hostname: string): Promise<boolean>`
  - `getAllSitemapUrls(hostname: string): Promise<string[]>` - извлечение всех URLs

### 5.3 API: Content Extraction Service

**API: `apps/api/src/modules/content/`**

- [x] Создать **ContentExtractionService** (`services/content-extraction.service.ts`):
  - `extractContent(url: string): Promise<{ title: string; content: string }>`
    - Fetch HTML
    - Парсинг через cheerio
    - Удаление всех HTML-тегов и JavaScript
    - Обрезка до первых 3000 слов
  - `calculateHash(content: string): string` - SHA256

- [x] Создать **ContentStoreService** (`services/content-store.service.ts`):
  - `storeContent(content: string): Promise<string>` - сохранение с дедупликацией
    - Вычисление hash
    - INSERT ... ON DUPLICATE KEY UPDATE refCount
    - Возврат hash
  - `getContent(hash: string): Promise<string>` - получение контента
  - `decrementRefCount(hashes: string[]): Promise<void>` - уменьшение refCount

- [x] Создать **SnapshotService** (`services/snapshot.service.ts`):
  - `createSnapshot(orderId: number, urls: string[]): Promise<void>`
    - Для каждого URL: извлечь контент, сохранить в ContentStore, создать SnapshotUrl

---

## Этап 6: Payments Module (Stripe Integration)

### 6.1 API: Stripe Service

**API: `apps/api/src/modules/stripe/` (создать новый, используя подход из `apps/_api`)**

- [x] Создать **StripeService** (`services/stripe.service.ts`):
  - `createCheckoutSession(orderId: number, amount: number): Promise<string>`
  - `createPaymentIntent(orderId: number, amount: number): Promise<string>`
  - `checkSessionStatus(sessionId: string): Promise<'complete' | 'open' | 'expired'>`
  - `createRefund(paymentIntentId: string): Promise<void>`

- [x] Создать **PaymentsController** (`controllers/payments.controller.ts`):
  ```typescript
  @Controller('api/orders/:orderId/payment')
  export class PaymentsController {
    @Post('checkout')
    async createCheckoutSession(@Param('orderId') orderId: number, @Session() session) {}
    
    @Post('intent')
    async createPaymentIntent(@Param('orderId') orderId: number, @Session() session) {}
    
    @Post('refund')
    async requestRefund(@Param('orderId') orderId: number, @Session() session) {}
  }
  ```

- [x] Создать **Webhook handler** для Stripe:
  - Обработка `checkout.session.completed`
  - Обработка `payment_intent.succeeded`
  - Обновление Order.status = PAID
  - Постановка задания в очередь

### 6.2 UI: Payment Integration

**UI: `apps/ui/src/lib/services/`**

- [ ] Создать **PaymentService** (`payment.service.ts`):
  - `createCheckout(orderId: number): Promise<void>` - редирект на Stripe
  - `createPaymentIntent(orderId: number): Promise<string>` - встроенная форма

---

## Этап 7: Generation Module (LLM Integration)

### 7.1 API: LLM Provider Services

**API: `apps/api/src/modules/generations/` (создать новый, используя подход из `apps/_api`)**

- [x] Создать базовый **LLMProviderService** (`services/base-llm-provider.service.ts`):
  ```typescript
  export abstract class BaseLLMProviderService {
    abstract generateSummary(content: string, title: string): Promise<string>;
    abstract generateDescription(summaries: Array<{title: string; summary: string}>): Promise<string>;
  }
  ```

- [x] Создать **GeminiService** (`services/gemini.service.ts`):
  - `extends BaseLLMProviderService`
  - Интеграция с Gemini API (обновлен на @google/genai SDK)
  - Обработка rate limits

- [x] Создать **OllamaService** (`services/ollama.service.ts`):
  - `extends BaseLLMProviderService`
  - Интеграция с локальным Ollama

- [x] Создать **LLMProviderFactory** (`services/llm-provider-factory.service.ts`):
  - `getProvider(serviceClass: string): BaseLLMProviderService`
  - DI injection провайдеров

### 7.2 API: Cache Service

**API: `apps/api/src/modules/generations/`**

- [x] Создать **CacheService** (`services/cache.service.ts`):
  - `getCachedSummary(modelId: string, contentHash: string): Promise<string | null>`
  - `setCachedSummary(modelId: string, contentHash: string, summary: string): Promise<void>`
  - TTL: 24 часа

### 7.3 API: Generation Job Handler

**API: `apps/api/src/modules/queue/handlers/generation-job.handler.ts`**

**Референс:** Адаптировать из `apps/_api/src/modules/queue/handlers/generation-job.handler.ts`

- [ ] Создать **GenerationJobHandler** — обработчик заданий из очереди:
  ```typescript
  /**
   * Алгоритм обработки согласно PRD 9.1:
   * 1. Order.status = QUEUED → Job добавлена в очередь
   * 2. Воркер берет задание → Загружает Order + SnapshotUrls
   * 3. FOR EACH page IN snapshot (батчами согласно model.batchSize):
   *      a. Получить rawContent из ContentStore по contentHash
   *      b. Проверить Redis кэш по contentHash
   *      c. Если HIT: использовать кэшированное саммари
   *      d. Если MISS: вызвать LLM API, закэшировать результат
   *      e. Обновить прогресс через job.updateProgress()
   * 4. Сгенерировать описание сайта (из всех саммари)
   * 5. Форматировать llms.txt output
   * 6. Сохранить в Order.output
   * 7. Обновить Order.status = COMPLETED
   * 8. Очистка: уменьшить ContentStore refCounts
   */
  @Injectable()
  export class GenerationJobHandler {
    private readonly logger = new Logger(GenerationJobHandler.name);
    
    constructor(
      private readonly modelsConfigService: ModelsConfigService,
      private readonly contentStoreService: ContentStoreService,
      private readonly cacheService: CacheService,
      private readonly llmProviderFactory: LLMProviderFactory,
      private readonly webSocketService: WebSocketService,
      private readonly statsService: StatsService,
      @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
      @InjectRepository(SnapshotUrl) private readonly snapshotUrlRepository: Repository<SnapshotUrl>,
      private readonly dataSource: DataSource,
    ) {}
    
    async handle(job: Job<{ orderId: number }>): Promise<void> {
      const { orderId } = job.data;
      
      // 1. Загрузить Order + SnapshotUrls
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['snapshotUrls'],
      });
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      // Получить конфигурацию модели
      const modelConfig = this.modelsConfigService.getModelById(order.modelId);
      const batchSize = modelConfig.batchSize;
      const provider = this.llmProviderFactory.getProvider(modelConfig.serviceClass);
      
      // 2. Обновить статус на PROCESSING
      OrderStatusMachine.validateTransition(order.status, OrderStatus.PROCESSING);
      await this.orderRepository.update(orderId, {
        status: OrderStatus.PROCESSING,
        startedAt: new Date(),
      });
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        // 3. Обработка страниц батчами
        const summaries: PageSummary[] = [];
        const totalUrls = order.snapshotUrls.length;
        let batch: SnapshotUrl[] = [];
        
        for (const snapshotUrl of order.snapshotUrls) {
          batch.push(snapshotUrl);
          
          if (batch.length >= batchSize) {
            await this.processBatch(batch, order.modelId, provider, summaries);
            
            // Обновить прогресс через BullMQ job
            await job.updateProgress({
              processedUrls: summaries.length,
              totalUrls,
            });
            
            // WebSocket: отправить прогресс подписчикам
            this.webSocketService.sendProgress(orderId, summaries.length, totalUrls, 'pages');
            
            batch = [];
          }
        }
        
        // Обработать оставшийся батч
        if (batch.length > 0) {
          await this.processBatch(batch, order.modelId, provider, summaries);
          await job.updateProgress({ processedUrls: summaries.length, totalUrls });
          this.webSocketService.sendProgress(orderId, summaries.length, totalUrls, 'pages');
        }
        
        // 4. Генерация Description сайта
        this.webSocketService.sendProgress(orderId, summaries.length, totalUrls, 'description');
        const description = await provider.generateDescription(summaries);
        
        // 5. Форматирование llms.txt
        const output = LlmsTxtFormatter.format(order.hostname, description, summaries);
        
        // 6-7. Сохранение результата
        await queryRunner.manager.update(Order, orderId, {
          output,
          llmsEntriesCount: summaries.length,
          status: OrderStatus.COMPLETED,
          completedAt: new Date(),
          processedUrls: summaries.length,
        });
        
        await queryRunner.commitTransaction();
        
        // 8. Очистка: уменьшить ContentStore refCounts
        const hashes = order.snapshotUrls.map(s => s.contentHash);
        await this.contentStoreService.decrementRefCount(hashes);
        
        // WebSocket: уведомление о завершении
        this.webSocketService.sendCompletion(orderId, OrderStatus.COMPLETED);
        await this.webSocketService.broadcastStatsUpdate(this.statsService);
        
        this.logger.log(`Order ${orderId} completed successfully`);
        
      } catch (error) {
        await queryRunner.rollbackTransaction();
        
        // Сохранить ошибку в Order (отдельная транзакция)
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.orderRepository.update(orderId, {
          status: OrderStatus.FAILED,
          errors: errorMessage,
        });
        
        this.webSocketService.sendCompletion(orderId, OrderStatus.FAILED);
        
        this.logger.error(`Order ${orderId} failed: ${errorMessage}`);
        throw error;  // Пробросить для retry BullMQ
        
      } finally {
        await queryRunner.release();
      }
    }
    
    /**
     * Обработка батча страниц
     */
    private async processBatch(
      batch: SnapshotUrl[],
      modelId: string,
      provider: BaseLLMProviderService,
      summaries: PageSummary[],
    ): Promise<void> {
      for (const snapshotUrl of batch) {
        // a. Получить rawContent из ContentStore
        const rawContent = await this.contentStoreService.getContent(snapshotUrl.contentHash);
        
        // b-c. Проверить кэш
        let summary = await this.cacheService.getCachedSummary(modelId, snapshotUrl.contentHash);
        
        if (!summary) {
          // d. Генерация через LLM + кэширование
          summary = await provider.generateSummary(rawContent, snapshotUrl.title);
          await this.cacheService.setCachedSummary(modelId, snapshotUrl.contentHash, summary);
        }
        
        summaries.push({
          url: snapshotUrl.url,
          title: snapshotUrl.title,
          summary,
        });
      }
    }
  }
  ```

  **Гарантии (PRD 9.3 — 100% успех или FAILED):**
  - Если LLM API вернул ошибку на любой странице — ROLLBACK, Order.status = FAILED
  - Order.output заполняется ТОЛЬКО при полном успехе всех страниц
  - При FAILED: ошибка сохраняется в Order.errors, пользователь может запросить refund
  - BullMQ автоматически повторит job до 3 раз с экспоненциальной задержкой

- [ ] Создать **LlmsTxtFormatter** (`utils/llms-txt-formatter.ts`):
  ```typescript
  export class LlmsTxtFormatter {
    static format(hostname: string, description: string, pages: PageSummary[]): string {
      const lines: string[] = [
        `# ${hostname}`,
        '',
        `> ${description}`,
        '',
        '## Pages',
        '',
      ];
      
      for (const page of pages) {
        lines.push(`### ${page.title}`);
        lines.push(`URL: ${page.url}`);
        lines.push('');
        lines.push(page.summary);
        lines.push('');
      }
      
      return lines.join('\n');
    }
  }
  ```

---

## Этап 8: Queue Module (BullMQ Integration)

### 8.1 API: Queue Configuration

**API: `apps/api/src/modules/queue/` (создать новый, используя подход из `apps/_api`)**

> **ВАЖНО:** Worker НЕ запускается вместе с основным приложением.  
> Worker запускается **отдельной CLI командой** для возможности масштабирования и независимого деплоя.

- [ ] Настроить **BullMQ очереди динамически из конфигурации моделей**:
  - Имя очереди берётся из `model.queueName` (см. Этап 3)
  - Тип очереди (`local`/`cloud`) берётся из `model.queueType`
  - **НЕ хардкодить имена очередей** — они определяются в MODELS_CONFIG

- [ ] Создать **QueueService** (`services/queue.service.ts`):
  - `addOrderToQueue(orderId: number, queueName: string): Promise<string>` - возврат jobId
  - `getQueuePosition(queueName: string, jobId: string): Promise<number | null>` — позиция из BullMQ напрямую (см. PRD 9.2)
  - `removeJob(jobId: string): Promise<void>`
  - `createWorker(queueName: string, handler: (job: Job) => Promise<void>): Worker` — фабрика worker-ов
  
  **Настройки повторов (PRD 9.4):**
  ```typescript
  // При добавлении job в очередь
  await queue.add('generation', { orderId }, {
    attempts: 3,  // Максимум 3 попытки
    backoff: {
      type: 'exponential',
      delay: 5000  // 5s, 10s, 20s
    }
  });
  ```

### 8.2 CLI: Generation Worker Command

**API: `apps/api/src/cli/commands/generation-worker.command.ts`**

**Референс:** Адаптировать из `apps/_api/src/cli/commands/generation-worker.command.ts`

- [ ] Создать **GenerationWorkerCommand**:
  ```typescript
  @Command({
    name: 'generation-worker:start',
    description: 'Start the generation worker to process jobs from the queue'
  })
  export class GenerationWorkerCommand extends CommandRunner {
    private readonly logger = new Logger(GenerationWorkerCommand.name);
    private readonly workers: Worker[] = [];
    private isShuttingDown = false;
    
    constructor(
      private readonly queueService: QueueService,
      private readonly modelsConfigService: ModelsConfigService,
      private readonly generationJobHandler: GenerationJobHandler,
    ) {
      super();
    }
    
    async run(): Promise<void> {
      this.logger.log('Starting generation worker...');
      
      // Получить все уникальные очереди из конфигурации моделей
      const queueNames = this.modelsConfigService.getUniqueQueueNames();
      
      // Создать worker для каждой очереди
      for (const queueName of queueNames) {
        const worker = this.queueService.createWorker(queueName, this.processJob);
        this.workers.push(worker);
        this.logger.log(`Worker started for ${queueName} queue`);
      }
      
      this.setupGracefulShutdown();
      
      // Keep process alive
      await new Promise(() => {});
    }
    
    private processJob = async (job: Job<{ orderId: number }>): Promise<void> => {
      await this.generationJobHandler.handle(job);
    };
    
    private setupGracefulShutdown(): void {
      process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }
    
    private gracefulShutdown(signal: string): void {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      this.logger.log(`Received ${signal}, starting graceful shutdown...`);
      
      const timeout = setTimeout(() => {
        this.logger.warn('Graceful shutdown timeout (10s)! Force exit...');
        process.exit(0);
      }, 10000);
      
      Promise.all(this.workers.map(w => w.close()))
        .then(() => {
          this.logger.log('All workers closed gracefully');
          clearTimeout(timeout);
          process.exit(0);
        });
    }
  }
  ```

- [ ] Зарегистрировать команду в **CliModule** (`cli/cli.module.ts`)

- [ ] Добавить npm script в `package.json`:
  ```json
  {
    "scripts": {
      "worker:start": "node dist/bootstrap/cli.js generation-worker:start"
    }
  }
  ```

**Запуск:**
```bash
# Основное приложение (API)
npm run start

# Worker (отдельный процесс)
npm run worker:start
```

---

## Этап 9: WebSocket Module (Real-time Updates)

### 9.1 API: WebSocket Gateway

**API: `apps/api/src/modules/websocket/` (создать новый, используя подход из `apps/_api`)**

> **Примечание:** Используется `@fastify/websocket`, а не socket.io.

- [ ] Создать **WebSocketService** (`services/websocket.service.ts`):
  ```typescript
  @Injectable()
  export class WebSocketService {
    private clients: Map<string, Set<WebSocket>> = new Map();
    
    // Регистрация клиента для получения уведомлений по orderId
    subscribe(orderId: number, client: WebSocket) {
      const key = `order:${orderId}`;
      if (!this.clients.has(key)) {
        this.clients.set(key, new Set());
      }
      this.clients.get(key)!.add(client);
    }
    
    unsubscribe(orderId: number, client: WebSocket) {
      const key = `order:${orderId}`;
      this.clients.get(key)?.delete(client);
    }
    
    // Broadcast ко всем клиентам, подписанным на заказ
    sendToOrder(orderId: number, event: string, data: unknown) {
      const key = `order:${orderId}`;
      const message = JSON.stringify({ event, data });
      this.clients.get(key)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
    
    sendQueuePosition(orderId: number, position: number, queueType: string) {
      this.sendToOrder(orderId, `order:${orderId}:queue`, { orderId, position, queueType });
    }
    
    sendProgress(orderId: number, processedUrls: number, totalUrls: number, stage: string) {
      this.sendToOrder(orderId, `order:${orderId}:progress`, { orderId, processedUrls, totalUrls, stage });
    }
    
    sendCompletion(orderId: number, status: OrderStatus) {
      this.sendToOrder(orderId, `order:${orderId}:complete`, { orderId, status });
    }
  }
  ```

- [ ] Создать **WebSocket Controller** (`controllers/websocket.controller.ts`):
  ```typescript
  @Controller()
  export class WebSocketController {
    constructor(private wsService: WebSocketService) {}
    
    @Get('/ws/orders')
    async handleOrdersWs(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
      // Fastify WebSocket upgrade
      await reply.hijack();
      const socket = await req.socket; // WebSocket connection
      
      socket.on('message', (msg: string) => {
        const { action, orderId } = JSON.parse(msg);
        if (action === 'subscribe') {
          this.wsService.subscribe(orderId, socket);
        }
      });
      
      socket.on('close', () => {
        // Cleanup subscriptions
      });
    }
  }
  ```

- [ ] Интегрировать с GenerationService:
  - Отправка прогресса после каждого батча
  - Отправка позиции в очереди

### 9.2 UI: WebSocket Client

**UI: `apps/ui/src/lib/services/`**

> **Примечание:** API использует `@fastify/websocket`, поэтому UI использует нативный WebSocket API браузера (без socket.io).

- [ ] Создать **WebSocketService** (`websocket.service.ts`):
  ```typescript
  export class WebSocketService {
    private socket: WebSocket | null = null;
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
    
    connect(path: string = '/ws/orders') {
      const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${path}`;
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const eventListeners = this.listeners.get(message.event);
        eventListeners?.forEach(cb => cb(message.data));
      };
    }
    
    on(event: string, callback: (data: unknown) => void) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(callback);
    }
    
    off(event: string, callback: (data: unknown) => void) {
      this.listeners.get(event)?.delete(callback);
    }
    
    subscribeToOrder(orderId: number, callbacks: {
      onQueue: (data: { position: number; queueType: string }) => void;
      onProgress: (data: { processedUrls: number; totalUrls: number }) => void;
      onComplete: (data: { status: string }) => void;
    }) {
      this.on(`order:${orderId}:queue`, callbacks.onQueue);
      this.on(`order:${orderId}:progress`, callbacks.onProgress);
      this.on(`order:${orderId}:complete`, callbacks.onComplete);
    }
    
    disconnect() {
      this.socket?.close();
      this.socket = null;
      this.listeners.clear();
    }
  }
  ```

---

## Этап 10: Statistics Module

### 10.1 API: Stats Service

**API: `apps/api/src/modules/stats/`**

- [ ] Создать **StatsService** (`services/stats.service.ts`):
  - `getCompletedCount(): Promise<number>` - COUNT Orders WHERE status = COMPLETED
  - `getStats(): Promise<{ completed: number }>` - агрегированная статистика

- [ ] Создать **StatsController** (`controllers/stats.controller.ts`):
  ```typescript
  @Controller('api/stats')
  export class StatsController {
    @Get('completed')
    async getCompleted() {
      return { count: await this.statsService.getCompletedCount() };
    }
  }
  ```

### 10.2 API: Stats WebSocket Gateway

**ВАЖНО: Realtime обновление счётчика статистики происходит ТОЛЬКО через WebSocket, не через REST polling.**

- [ ] Расширить **WebSocketService** для stats broadcast:
  ```typescript
  @Injectable()
  export class WebSocketService {
    // ... существующий код для orders ...
    
    private statsClients: Set<WebSocket> = new Set();
    
    subscribeToStats(client: WebSocket) {
      this.statsClients.add(client);
    }
    
    unsubscribeFromStats(client: WebSocket) {
      this.statsClients.delete(client);
    }
    
    /**
     * Вызывается из GenerationService при успешном завершении заказа.
     * Рассылает обновлённый счётчик ВСЕМ подключённым клиентам.
     */
    async broadcastStatsUpdate(statsService: StatsService): Promise<void> {
      const stats = await statsService.getStats();
      const message = JSON.stringify({ event: 'stats:update', data: stats });
      
      this.statsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
  ```

- [ ] Добавить WebSocket endpoint `/ws/stats` в контроллер

### 10.3 UI: Stats WebSocket Client

**UI: `apps/ui/src/lib/stores/`**

- [ ] Создать **StatsStore** (`stats.store.ts`):
  ```typescript
  import { writable, type Writable } from 'svelte/store';
  
  export class StatsStore {
    public readonly completedCount: Writable<number> = writable(0);
    private socket: WebSocket | null = null;
    
    async init(): Promise<void> {
      // Загрузка начального значения через REST
      const response = await fetch('/api/stats/completed');
      const data = await response.json();
      this.completedCount.set(data.count);
      
      // Подписка на realtime обновления через нативный WebSocket
      const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/stats`;
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.event === 'stats:update') {
          this.completedCount.set(message.data.completed);
        }
      };
    }
    
    destroy(): void {
      this.socket?.close();
      this.socket = null;
    }
  }
  
  // Singleton instance
  export const statsStore = new StatsStore();
  ```

**Поток данных:**
1. При загрузке страницы: GET /api/stats/completed (однократно)
2. При каждом завершении заказа: `GenerationService` → `WebSocketService.broadcastStatsUpdate()` → WebSocket event `stats:update` → все клиенты обновляют счётчик

---

## Этап 11: UI Implementation

### 11.1 Главная страница

**UI: `apps/ui/src/routes/`**

- [ ] Создать `+page.svelte`:
  - Форма ввода URL
  - Отображение публичной статистики через `statsStore` (см. Этап 10.3)
  - Вызов `statsStore.init()` при монтировании компонента
  - Вызов `statsStore.destroy()` при размонтировании
  - Счётчик обновляется автоматически через WebSocket
  - Вызов POST /api/orders при submit
  - Редирект на страницу Order после создания

### 11.2 Страница выбора модели

**UI: `apps/ui/src/routes/orders/[id]/`**

- [ ] Создать `+page.svelte`:
  - Загрузка Order по ID
  - Отображение списка availableModels
  - Группировка по category
  - Визуальное разделение доступных/недоступных моделей
  - Кнопка выбора модели → POST /api/orders/{id}/start

### 11.3 Страница оплаты

**UI: `apps/ui/src/routes/orders/[id]/payment/`**

- [ ] Создать `+page.svelte`:
  - Проверка статуса Order
  - Если PENDING_PAYMENT:
    - Кнопка "Оплатить" → POST /api/orders/{id}/payment/checkout
    - Редирект на Stripe Checkout
  - Polling статуса Order каждые 3 секунды

### 11.4 Страница прогресса генерации

**UI: `apps/ui/src/routes/orders/[id]/progress/`**

- [ ] Создать `+page.svelte`:
  - WebSocket подключение
  - Отображение позиции в очереди
  - Progress bar для обработки страниц
  - Индикатор генерации Description
  - Автоматический редирект на результат при завершении

### 11.5 Страница результата

**UI: `apps/ui/src/routes/orders/[id]/result/`**

- [ ] Создать `+page.svelte`:
  - Отображение успешной генерации
  - Кнопка скачивания (GET /api/orders/{id}/download)
  - Превью llms.txt
  - Кнопка "Создать новую генерацию"

### 11.6 Страница истории

**UI: `apps/ui/src/routes/history/`**

- [ ] Создать `+page.svelte`:
  - Загрузка списка Orders (GET /api/orders)
  - Таблица с колонками:
    - Hostname
    - Модель
    - Статус
    - Дата создания
    - Действия (Скачать/Возврат)
  - Фильтрация по статусу
  - Пагинация

### 11.7 Компоненты UI

**UI: `apps/ui/src/lib/components/`**

- [ ] `OrderStatusBadge.svelte` - статус Order с цветовой индикацией
- [ ] `ModelCard.svelte` - карточка модели с описанием
- [ ] `ProgressBar.svelte` - прогресс обработки
- [ ] `QueuePosition.svelte` - позиция в очереди
- [ ] `PricingDisplay.svelte` - отображение цены

---

## Этап 12: Дополнительная функциональность

### 12.1 Rate Limiting

**API: `apps/api/src/modules/http/`**

- [ ] Создать **RateLimitGuard**:
  - Лимит на POST /api/orders: 5 запросов в час на IP
  - Хранение счетчиков в Redis

### 12.2 Cleanup Jobs

**API: `apps/api/src/modules/queue/`**

- [ ] Создать **CleanupService** (`services/cleanup.service.ts`):
  - Cron задание для удаления брошенных Orders (status=CREATED, старше 7 дней)
  - Cron задание для очистки ContentStore (refCount=0, lastAccessedAt > 30 дней)

- [ ] Настроить @nestjs/schedule:
  ```typescript
  @Cron('0 0 * * *')  // Ежедневно в полночь
  async cleanupAbandonedOrders() {}
  
  @Cron('0 2 * * *')  // Ежедневно в 2:00
  async cleanupContentStore() {}
  ```

### 12.3 Error Handling

**API: `apps/api/src/filters/`**

- [ ] Расширить **GlobalExceptionFilter** (`global-exception.filter.ts`):
  - Обработка специфичных ошибок проекта
  - Логирование в файл
  - Возврат понятных сообщений клиенту

### 12.4 Logging

**API: `apps/api/src/config/`**

- [ ] Расширить **LoggerConfig** (`config.logger.ts`):
  - Отдельные логи для генерации
  - Отдельные логи для платежей
  - Ротация логов

---

## Этап 13: Testing

### 13.1 API E2E Tests

**API: `apps/api/test/`**

- [ ] Создать тесты для Orders flow:
  - `04-orders.e2e-spec.ts` - создание Order, старт, генерация
  - `05-payments.e2e-spec.ts` - Stripe integration
  - `06-websocket.e2e-spec.ts` - WebSocket события

- [ ] Использовать существующие fixtures и helpers

### 13.2 UI Component Tests

**UI: `apps/ui/src/lib/components/`**

- [ ] Создать unit тесты для компонентов:
  - ModelCard.test.ts
  - ProgressBar.test.ts
  - OrderStatusBadge.test.ts

---

## Этап 14: Documentation

- [ ] Создать API документацию (Swagger)
- [ ] Обновить README.md с инструкциями по запуску
- [ ] Создать .env.example с примерами конфигурации
- [ ] Документировать структуру конфигурации моделей

---

## Порядок реализации (Recommended)

### Фаза 1: Фундамент (1-2 недели)
1. Этап 1: Подготовка инфраструктуры
2. Этап 2: Модели данных
3. Этап 3: Конфигурация моделей

### Фаза 2: Базовая функциональность (2-3 недели)
4. Этап 4: Аутентификация
5. Этап 5: Orders API
6. Этап 11.1-11.2: UI главная и выбор модели

### Фаза 3: Генерация (2-3 недели)
7. Этап 7: Generation Module (LLM Integration)
8. Этап 8: Queue Module
9. Этап 9: WebSocket Module
10. Этап 11.4-11.5: UI прогресс и результат

### Фаза 4: Платежи (1-2 недели)
11. Этап 6: Payments Module
12. Этап 11.3: UI оплата

### Фаза 5: Полировка (1 неделя)
13. Этап 10: Statistics
14. Этап 11.6-11.7: UI история и компоненты
15. Этап 12: Дополнительная функциональность

### Фаза 6: Тестирование (1 неделя)
16. Этап 13: Testing
17. Этап 14: Documentation

---

## Ключевые технические решения

### MVC архитектура в NestJS
- **Models:** TypeORM entities
- **Controllers:** Обработка HTTP запросов, валидация, авторизация
- **Services:** Вся бизнес-логика

### Разделение ответственности
- **Controller:** Только HTTP-слой, делегирует всё в Service
- **Service:** Бизнес-логика, оркестрация между модулями
- **Repository:** Доступ к данным (через TypeORM)

### Принцип единственной ответственности
- Каждый сервис решает одну задачу
- Нет God Objects
- Композиция сервисов через DI

---

## Конец плана имплементации
