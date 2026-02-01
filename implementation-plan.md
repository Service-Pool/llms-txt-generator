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
        │   └── services/
        │       └── content-extraction.service.ts
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

> **См. выполненные задачи в `implementation-plan-done.md`**

---

## Этап 2: Модели данных (Model layer)

> **См. выполненные задачи в `implementation-plan-done.md`**

**ВАЖНО:** Order entity БЕЗ связи `snapshotUrls` - контент извлекается на лету в воркере.
**ВАЖНО:** НЕТ entities `SnapshotUrl` и `ContentStore` - упрощенная архитектура.

---

## Этап 3: Конфигурация моделей (Model Configuration)

> **См. выполненные задачи в `implementation-plan-done.md`**

---

## Этап 4: Аутентификация (Auth Module)

> **API часть выполнена - см. `implementation-plan-done.md`**

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

> **Этап 5 выполнен - см. `implementation-plan-done.md`**

---

## Этап 6: Payments Module (Stripe Integration)

> **API часть выполнена - см. `implementation-plan-done.md`**

### 6.2 UI: Payment Integration

**UI: `apps/ui/src/lib/services/`**

- [ ] Создать **PaymentService** (`payment.service.ts`):
  - `createCheckout(orderId: number): Promise<void>` - редирект на Stripe
  - `createPaymentIntent(orderId: number): Promise<string>` - встроенная форма

---

## Этап 7: Generation Module (LLM Integration)

> **Выполнено - см. `implementation-plan-done.md`**

---

## Этап 8: Queue Module (BullMQ Integration)

> **Выполнено - см. `implementation-plan-done.md`**

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

- [ ] Настроить @nestjs/schedule:
  ```typescript
  @Cron('0 0 * * *')  // Ежедневно в полночь
  async cleanupAbandonedOrders() {}
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
