# Требования к продукту: LLMs.txt Generator

**Версия:** 1.0  
**Дата:** 25 января 2026  
**Статус:** Черновик для архитектурного ревью

---

## 1. Обзор продукта

### 1.1 Видение
SaaS-платформа для автоматической генерации llms.txt файлов с любого веб-сайта с использованием AI-суммаризации контента.

### 1.2 Целевая аудитория
- **Основная:** Веб-мастера собственных сайтов
- **Use Case:** Создание AI-friendly файлов документации для улучшения индексации LLM-инструментами

### 1.3 Ценностное предложение
- **Автоматизация:** Не нужно писать llms.txt вручную
- **AI-мощь:** Качественные саммари с использованием различных LLM-провайдеров
- **Freemium модель:** Бесплатные модели доступны, премиум для лучшего качества
- **Простота:** Просто введите URL, получите результат

### 1.4 Стандарт llms.txt

**Спецификация:** https://llmstxt.org/

**Формат генерируемого файла:**

```markdown
# {Site Title}

> {AI-сгенерированное описание сайта на основе всех страниц}

## Pages

- [{Page 1 Title}]({url1}): {AI-саммари страницы}
- [{Page 2 Title}]({url2}): {AI-саммари страницы}
- ...
```

**Процесс генерации:**
1. **Саммари страниц:** LLM генерирует краткое описание для каждой страницы
2. **Description сайта:** После обработки всех страниц, LLM генерирует общее описание сайта на основе всех саммари (отдельный LLM вызов)
3. **Форматирование:** Сборка в Markdown согласно стандарту

---

## 2. Бизнес-модель

### 2.1 Стратегия монетизации
**Freemium Pay-Per-Generation (оплата за генерацию)**

- Пользователи выбирают между бесплатными AI-моделями (например, Ollama) и платными (например, Gemini)
- Каждая генерация — отдельная транзакция
- Нет подписок, нет лимитов на размер сайта

### 2.2 Формула ценообразования
```
Цена = Базовая ставка провайдера × Количество страниц
```

**Примеры:**
- Ollama: €0.00 × страницы = Бесплатно
- Gemini: €0.01 × страницы = зависит от размера сайта

### 2.3 Процесс оплаты
1. Пользователь вводит URL сайта
2. Система анализирует и рассчитывает цену: "Найдено N страниц, Gemini = X€, Ollama = Бесплатно"
3. Пользователь выбирает провайдера
4. Пользователь платит (если платный провайдер) → Генерация запускается
5. Пользователь получает файл llms.txt

### 2.4 Повторные генерации
- Каждая генерация (даже для того же URL) = новый снапшот, новая оплата
- Нет периода "бесплатной повторной генерации"
- Каждый Order независим

---

## 3. Пользовательский опыт

### 3.1 Основной пользовательский флоу

```
[Ввод URL] → [Анализ] → [Показ цены] → [Выбор провайдера] → [Оплата] → [Прогресс в реальном времени] → [Скачать результат]
```

**Детальные шаги:**

1. **Ввод URL:** Пользователь указывает URL сайта (например, https://example.com)
2. **Фаза анализа:**
   - API проверяет наличие robots.txt и sitemap.xml
   - **КРИТИЧНО:** Если хотя бы один из файлов отсутствует → ошибка, Order не создается
   - API создает Order (hostname, status=CREATED)
   - Система парсит sitemap.xml
   - Извлекает контент со всех страниц
   - Создает снапшот с привязкой к orderId (неизменяемый)
   - Подсчитывает totalUrls и сохраняет в Order
   - **Возвращает Order + массив availableModels с ценами за эту генерацию**
3. **Выбор модели и запуск:**
   - UI показывает модели из ответа POST /api/orders (уже с ценами за эту генерацию)
   - **Фильтрация по pageLimit:** Модель показывается, но НЕ доступна для выбора если `totalUrls > model.pageLimit`
     - Пример: сайт имеет 600 страниц, модель с pageLimit=500 показывается как "Недоступно (превышен лимит 500 страниц)"
     - Модели с `pageLimit: false` (без лимита) всегда доступны для выбора
   - Пользователь выбирает доступную модель (бесплатную или платную)
   - UI вызывает `POST /api/orders/{id}/start` с выбранным modelId
   - API фиксирует модель и цену в Order
   - **Для бесплатных моделей:** Order сразу → QUEUED (генерация начинается)
   - **Для платных моделей:** Order → PENDING_PAYMENT, фронт вызывает `/payment/checkout` или `/payment/intent`
4. **Оплата (если требуется):**
   - Stripe Checkout или Payment Intent
   - Пользователь завершает оплату
5. **Генерация:**
   - Отслеживание прогресса в реальном времени через WebSocket
   - Показывает "Обработано X/N страниц"
   - После обработки всех страниц: "Обработка Description"
6. **Завершение:**
   - Скачивание llms.txt через API endpoint (GET /api/orders/{id}/download)
   - Контент хранится в Order.output навсегда
   - Файл генерируется на лету при запросе (не хранится на диске)

### 3.2 История пользователя
- Все генерации сохраняются постоянно
- Каждая запись показывает:
  - Hostname
  - Использованный провайдер
  - Статус (Ожидает оплаты, Обработка, Завершено, Ошибка)
  - Дата создания
  - Кнопка скачивания (если завершено)
- Пользователи видят ТОЛЬКО свои генерации (приватность)

### 3.3 Публичная статистика системы
- На главной странице отображается счетчик: "Всего выполнено X генераций"
- Обновляется в реальном времени при каждом завершении генерации
- Считаются только успешные генерации (Order.status = COMPLETED)
- Источник данных: `SELECT COUNT(*) FROM orders WHERE status = 'COMPLETED'`
- Цель: Social proof, демонстрация активности платформы

**Позиция в очереди (для каждого Order):**
- Две логические очереди: **локальная** (local models) и **облачная** (cloud models)
- Локальная: модели потребляющие собственные ресурсы (Ollama и т.д.)
- Облачная: модели через внешние API (Gemini, OpenAI и т.д.)
- Каждый Order в статусе QUEUED или PROCESSING показывает позицию: "Позиция в очереди: 12"
- **Позиция берется из BullMQ напрямую** (см. раздел 9.2)
- Обновляется в реальном времени через WebSocket

**Определение очереди:**
- Берется из конфигурации модели: `model.queueName`
- Примеры: `generation-free` (локальная), `generation-quality` (облачная), `generation-premium` (облачная)
- Разделение: по типу ресурсов (local vs cloud), а не по названию очереди
- В конфигурации модели нужно добавить поле `queueType: "local" | "cloud"`

### 3.4 Неудачные генерации
- Пользователь может инициировать возврат средств вручную
- Возврат доступен если:
  - Статус = FAILED
  - Оплата была завершена
  - Задание удалено из очереди
- Нет автоматических возвратов

### 3.5 Обработка частичного успеха
**Не допускается вообще.** Генерация либо:
- **SUCCESS:** ВСЕ 100% страниц успешно обработаны AI → output доступен
- **FAILED:** Хотя бы ОДНА страница упала → нет output, возврат доступен

**Принцип "все или ничего":** Пользователь платит за полную генерацию, получает полный результат или возврат.

---

## 4. Техническая архитектура

### 4.1 Компоненты системы

**Backend:**
- NestJS API (TypeScript)
- MySQL (постоянное хранилище)
- Redis (кэш AI саммари)
- BullMQ (очередь задач)
- Stripe (платежи)

**Frontend:**
- SvelteKit
- WebSocket (обновления в реальном времени)

**Внешние:**
- Множество LLM-провайдеров (Gemini, Ollama и др.)

### 4.2 API-First подход
- **Первично:** RESTful API
- **Вторично:** Frontend UI (будет рефакторен для использования API)
- Вся бизнес-логика в API-слое
- API спроектирован для программного доступа (будущие интеграции)

### 4.3 Основные API endpoints

**Анализ и создание Order:**
- `POST /api/orders` - Создание Order + анализ + возврат доступных моделей с ценами (rate limited)
- `POST /api/orders/{id}/start` - Запуск Order в работу (выбор модели, фиксация цены, возврат Order с новым статусом)

**Оплата:**
- `POST /api/orders/{id}/payment/checkout` - Создание Stripe Checkout Session
- `POST /api/orders/{id}/payment/intent` - Создание Stripe Payment Intent
- `POST /api/orders/{id}/refund` - Запрос возврата средств
- `GET /api/orders` - Список Orders пользователя (с polling проверкой оплат)

**Генерация и результат:**
- `GET /api/orders/{id}` - Полные данные Order (статус, прогресс, результат)
- `GET /api/orders/{id}/download` - Скачивание llms.txt
- `WebSocket /ws` - Прогресс в реальном времени (авторизация через session cookie)

**Аутентификация:**
- `POST /api/auth/request-login-link` - Отправка magic link на email
- `GET /api/auth/verify-login-link?token={token}` - Подтверждение входа по токену
- `POST /api/auth/logout` - Выход из системы (очистка сессии)
- `GET /api/auth/me` - Получение информации о текущем пользователе

**Статистика:**
- `GET /api/stats/completed` - Количество выполненных генераций

### 4.4 Конфигурация провайдеров
**Динамическая система провайдеров:**

**Источник конфигурации:** `.env` файл (загружается при старте приложения)

**Важно:** Пользователь видит не "реального провайдера", а абстрактные модели (коды/названия).

**Архитектура:**
- Model (для пользователя): "fast", "quality", "premium"
- Service Class (технический): GeminiService, OllamaService, OpenAIService
- Привязка через конфиг, не через код

**Пример:**
```yaml
models:
  - id: "llama3-local"
    category: "Fast"
    displayName: "Llama 3 (Локально)"
    description: "Быстрая бесплатная модель"
    serviceClass: "OllamaService"
    modelName: "llama3"
    baseRate: 0
    pageLimit: 500
    queueName: "generation-free"
    queueType: "local"
    batchSize: 2
    
  - id: "gemini-1.5-pro"
    category: "Clever"
    displayName: "Gemini 1.5 Pro"
    description: "Высокое качество для средних сайтов"
    serviceClass: "GeminiService"
    modelName: "gemini-1.5-pro"
    baseRate: 0.01
    pageLimit: 1000
    queueName: "generation-quality"
    queueType: "cloud"
    batchSize: 20
    
  - id: "gpt-4-turbo"
    category: "Premium"
    displayName: "GPT-4 Turbo"
    description: "Максимальное качество без ограничений"
    serviceClass: "OpenAIService"
    modelName: "gpt-4-turbo"
    baseRate: 0.02
    pageLimit: false
    queueName: "generation-premium"
    queueType: "cloud"
    batchSize: 20
```

**Конфигурация каждой модели включает:**
- `id`: Уникальный идентификатор модели (формат: `{model}-{variant}`)
- `category`: Категория для группировки в UI (Fast, Clever, Premium)
- `displayName`: Название для отображения пользователю
- `description`: Описание модели
- `serviceClass`: Класс NestJS сервиса для провайдера
- `modelName`: Техническое имя модели для API провайдера
- `baseRate`: Ставка за страницу (0 = бесплатно)
- `pageLimit`: Лимит страниц (number или false = unlimited)
- `queueName`: Имя очереди обработки
- `queueType`: Тип очереди (`"local"` или `"cloud"`) - для показа позиции в очереди
- `batchSize`: Размер батча для обработки

**Логика платности:**
- `baseRate = 0` → бесплатная модель, доступна всем (включая анонимных)
- `baseRate > 0` → платная модель, требует авторизации

---

## 5. Абстракция провайдеров и моделей

### 5.1 Проблема

**Не смешивать технические детали и бизнес-логику:**
- Пользователю не важно что модель работает через Gemini API или Ollama
- Пользователю важны: качество, скорость, цена
- Провайдер может меняться без изменения пользовательского интерфейса

### 5.2 Решение: Provider ≠ Model

**Model (единственная сущность):**
```typescript
interface Model {
  id: string;  // "llama3-local", "gemini-1.5-pro", "gpt-4-turbo"
  category: string;  // "Fast", "Clever", "Premium"
  displayName: string;  // "Llama 3 (Локально)", "Gemini 1.5 Pro"
  description: string;  // "Быстрая бесплатная модель"
  
  serviceClass: string;  // "GeminiService", "OllamaService"
  modelName: string;  // "gemini-pro", "llama3"
  
  baseRate: number;  // цена за страницу
  pageLimit: number | false;  // лимит страниц
  
  queueName: string;
  queueType: 'local' | 'cloud';  // для расчета позиции в очереди
  batchSize: number;
}
```

**Преимущества:**
- Нет лишних абстракций (Provider убран)
- Явная связь с кодом через serviceClass
- Нет if/switch по implementation
- DI контейнер NestJS управляет инстансами сервисов

**Order хранит:**
```typescript
Order {
  modelId: string;  // "gemini-1.5-pro", "llama3-local"
  // ...
}
```

### 5.3 Примеры конфигурации

**Примеры:**

```yaml
# Бесплатная локальная модель
- id: "llama3-local"
  category: "Fast"
  displayName: "Llama 3 (Локально)"
  description: "Быстрая бесплатная генерация"
  serviceClass: "OllamaService"
  modelName: "llama3"
  baseRate: 0
  pageLimit: 500
  queueName: "generation-free"
  queueType: "local"
  batchSize: 2

# Та же модель через облако
- id: "llama3-cloud"
  category: "Fast"
  displayName: "Llama 3 (Облако)"
  description: "Быстрая облачная генерация"
  serviceClass: "ReplicateService"
  modelName: "meta/llama-3-70b"
  baseRate: 0.005
  pageLimit: 1000
  queueName: "generation-quality"
  queueType: "cloud"
  batchSize: 20

✅ **Гибкость:** Меняем провайдера без изменения UI  
✅ **Простота для пользователя:** Выбирает по качеству/цене, а не по технологии  
✅ **Масштабируемость:** Легко добавлять новые модели  
✅ **A/B тестирование:** Можно переключать провайдера для одного code  
✅ **Миграция:** Переезд с Gemini на OpenAI прозрачен для пользователей  

### 5.4 UI выбора модели

**API возвращает Order с массивом доступных моделей:**
```json
POST /api/orders Response:
{
  "order": {
    "id": 123,
    "hostname": "example.com", 
    "status": "CREATED",
    "totalUrls": 600,
    "createdAt": "..."
  },
  "availableModels": [
    {
      "id": "llama3-local",
      "category": "Fast", 
      "displayName": "Llama 3 (Локально)",
      "description": "Быстрая бесплатная модель",
      "baseRate": 0,
      "pageLimit": 500,
      "price": "Бесплатно",
      "totalPrice": "Бесплатно",
      "available": false,
      "unavailableReason": "Превышен лимит 500 страниц"
    },
    {
      "id": "gemini-1.5-pro",
      "category": "Clever",
      "displayName": "Gemini 1.5 Pro", 
      "description": "Высокое качество для средних сайтов",
      "baseRate": 0.01,
      "pageLimit": 1000,
      "price": "€0.01/стр",
      "totalPrice": "€6.00",
      "available": true,
      "unavailableReason": null
    }
  ]
}
```

**Отображение:**
- Все модели в виде карточек или списка
- Группировка по `category` (Fast, Clever, Premium)
- Для каждой: displayName, description, цена
- **Недоступные модели:** показываются серыми с текстом "unavailableReason", кнопка выбора неактивна
- **Доступные модели:** полноцветные, кнопка выбора активна

---

## 6. Domain-модель

### 6.1 Основные сущности

#### User (Пользователь)
```typescript
User {
  id: number
  email: string
  createdAt: Date
  updatedAt: Date
}
```

#### Order (Заказ)
```typescript
Order {
  // Идентификация
  id: number
  userId: number | null
  sessionId: string | null  // для анонимных пользователей
  
  // Что генерировать
  hostname: string
  modelId: string | null  // null до выбора модели, затем "llama3-local", "gemini-1.5-pro"
  
  // Цена (фиксируется при выборе модели в /start)
  priceTotal: number | null  // null до выбора модели
  priceCurrency: Currency | null  // null до выбора модели
  pricePerUrl: number | null  // null до выбора модели
  
  // Платеж (только ОДНО из двух)
  stripeSessionId: string | null  // Stripe Checkout
  stripePaymentIntentSecret: string | null  // Payment Intent
  // ВАЖНО: Заполняется только одно поле в зависимости от выбранного метода оплаты
  
  // Выполнение
  status: OrderStatus
  jobId: string | null
  startedAt: Date | null
  completedAt: Date | null
  
  // Результат
  output: string | null  // финальное содержимое llms.txt
  llmsEntriesCount: number | null
  errors: string | null
  
  // Прогресс
  totalUrls: number | null
  processedUrls: number | null
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
}
```

#### SnapshotUrl
**Примечание:** Entity в базе данных, не UI страница

```typescript
SnapshotUrl {
  id: number
  orderId: number FK
  url: string
  title: string
  contentHash: string  // SHA256(rawContent)
  
  createdAt: Date
}
```

#### ContentStore (Хранилище контента с дедупликацией)
```typescript
ContentStore {
  contentHash: string PRIMARY KEY  // SHA256
  rawContent: string  // извлеченный HTML/текст
  refCount: number  // сколько Orders используют этот контент
  firstSeenAt: Date
  lastAccessedAt: Date
}
```

### 6.2 State Machine статусов Order

```
CREATED (создан, анализ завершен, модель НЕ выбрана)
  ↓ (/start с платной моделью)
PENDING_PAYMENT (ожидает оплаты, модель выбрана)
  ↓ (оплата завершена)
PAID
  ↓
QUEUED (задание добавлено в BullMQ)
  ↓
PROCESSING (воркер запущен)
  ↓
COMPLETED | FAILED
  ↓ (если failed)
REFUNDED (опционально, инициируется пользователем)
```

**Для бесплатных моделей:**
```
CREATED → QUEUED → PROCESSING → COMPLETED | FAILED
```

**Разрешенные переходы:**
- CREATED → PENDING_PAYMENT (/start с платной моделью, baseRate > 0)
- CREATED → QUEUED (/start с бесплатной моделью, baseRate = 0)
- PENDING_PAYMENT → PAID, PAYMENT_FAILED, CANCELLED
- PAID → QUEUED
- QUEUED → PROCESSING, CANCELLED
- PROCESSING → COMPLETED, FAILED, CANCELLED
- FAILED → REFUNDED (вручную)

**Терминальные статусы:** COMPLETED, CANCELLED, REFUNDED, PAYMENT_FAILED

**Контроль переходов:** Система должна валидировать переходы статусов и возвращать ошибку при попытке невалидного перехода.

### 6.3 Владение снапшотом

**Ключевой принцип:** Каждый Order владеет своим снапшотом (композиция, не разделение)

- User A Order 1: собственный снапшот в момент T1
- User B Order 2: собственный снапшот в момент T2
- Даже для одного hostname, снапшоты независимы
- Нет разделяемого изменяемого состояния между пользователями

---

## 7. Стратегия хранения данных

### 7.1 Content-Addressed Storage (Хранилище по адресу контента)

**Проблема:** Дублирующийся контент между Orders тратит место

**Решение:** Дедупликация контента через hash-based хранилище

**Реализация:**

1. **Во время анализа (создание Order):**
   ```sql
   FOR EACH page IN website:
     content = extract(page.url)
     hash = SHA256(content)
     
     INSERT INTO ContentStore (contentHash, rawContent, refCount)
     VALUES (hash, content, 1)
     ON DUPLICATE KEY UPDATE refCount = refCount + 1
     
     INSERT INTO SnapshotUrl (orderId, url, title, contentHash)
     VALUES (order.id, page.url, page.title, hash)
   ```

2. **Во время генерации:**
   ```sql
   SELECT osp.url, osp.title, cs.rawContent
   FROM SnapshotUrl osp
   JOIN ContentStore cs ON osp.contentHash = cs.contentHash
   WHERE osp.orderId = ?
   ```

3. **После успешной генерации (Очистка):**
   ```sql
   UPDATE ContentStore
   SET refCount = refCount - 1
   WHERE contentHash IN (
     SELECT contentHash FROM SnapshotUrl WHERE orderId = ?
   )
   
   -- Опционально: DELETE SnapshotUrl WHERE orderId = ? (экономия места)
   ```

4. **Cron задание (ежедневно):**
   ```sql
   DELETE FROM ContentStore
   WHERE refCount = 0
     AND lastAccessedAt < NOW() - INTERVAL 30 DAY
   ```

**Преимущества:**
- Одинаковый контент хранится физически один раз
- Orders остаются логически независимыми
- Эффективность хранения без сложности
- Безопасная очистка когда контент не используется

### 7.2 Оценка размера хранилища

**На один Order:**
- 1000 страниц × 50KB контента × коэффициент дедупликации 0.3 = ~15MB
- Уникальный контент растет сублинейно с Orders

**Стратегия очистки:**
- Сохранять страницы снапшота во время генерации (для retry)
- Удалять после успешного завершения (опционально)
- ContentStore самоочищается через refCount
- **Брошенные Orders:** Cron удаляет Orders в статусе CREATED старше 7 дней (с уменьшением refCount)

---

## 8. Стратегия кэширования

### 8.1 Назначение Redis кэша
**Кэшировать ТОЛЬКО AI саммари, НЕ контент**

- Контент (rawContent) → MySQL ContentStore (постоянное хранилище)
- AI Саммари → Redis (volatile кэш, можно потерять)

### 8.2 Структура ключей кэша

```
Key: summary:{modelId}:{contentHash}
Type: STRING
Value: {"title": "...", "summary": "..."}
```

**Пример:**
```redis
SET summary:gemini-1.5-pro:{hash_of_page1_content} '{"title":"Главная","summary":"..."}' EX 86400
SET summary:llama3-local:{hash_of_page2_content} '{"title":"О нас","summary":"..."}' EX 86400
```

### 8.3 Жизненный цикл кэша

**Стратегия TTL:**
- **TTL:** 24 часа для каждого ключа (фиксированный)
- Саммари истекает через 24 часа независимо от использования
- Предотвращает "вечный кэш" для популярного контента

**При cache HIT:**
- Вернуть кэшированное саммари
- TTL НЕ обновляется (естественное истечение)

**При cache MISS:**
- Сгенерировать через LLM
- Сохранить в Redis с TTL 24 часа
- Вернуть саммари

**Инвалидация кэша:**
- Автоматически через истечение TTL
- Контент изменился → новый hash → новое поле (старое поле истекает естественным образом)
- Ручная инвалидация не нужна

### 8.4 Разделение кэша на основе контента

**Сценарий:**
```
10:00 - User A: example.com/page1 (контент X) → hash(X) → AI саммари → Redis
10:30 - User B: example.com/page1 (тот же контент X) → hash(X) → cache HIT!
12:00 - User C: example.com/page1 (НОВЫЙ контент Y) → hash(Y) → cache MISS → новое саммари
```

**Результат:**
- User B экономит деньги (для провайдера сервиса)
- User B платит полную цену (нормально)
- Корректность гарантирована (hash меняется когда контент меняется)

### 8.5 Восстановление при отказе Redis

**Если Redis потерян:**
- Весь кэш AI саммари потерян
- Orders все еще имеют снапшоты в MySQL
- Регенерация возможна: ContentStore → LLM → новые саммари
- Дороже (вызовы LLM API) но система все еще работает

**Принцип:** Redis — оптимизация, не критическая зависимость

---

## 9. Процесс генерации

### 9.1 Флоу обработки задания

```
1. Order PAID/QUEUED → Добавить задание в BullMQ
2. Воркер берет задание → Загружает Order + Snapshot
3. FOR EACH page IN snapshot (батчами согласно model.batchSize):
     a. Получить rawContent из ContentStore
     b. Проверить Redis кэш по contentHash
     c. Если HIT: использовать кэшированное саммари
     d. Если MISS: вызвать LLM API, закэшировать результат
     e. Обновить прогресс через WebSocket
4. Сгенерировать описание сайта (из всех саммари)
5. Форматировать llms.txt output
6. Сохранить в Order.output
7. Обновить Order.status = COMPLETED
8. Очистка: уменьшить ContentStore refCounts
```

### 9.2 Прогресс в реальном времени

**WebSocket события:**

**Позиция в очереди:**
```typescript
{
  type: 'queue',
  orderId: 123,
  queuePosition: 5,  // позиция в логической очереди (local или cloud)
  queueType: 'local',  // 'local' или 'cloud'
  status: 'QUEUED'
}
```

**Обработка страниц:**
```typescript
{
  type: 'progress',
  orderId: 123,
  processedUrls: 50,
  totalUrls: 200,
  status: 'PROCESSING',
  stage: 'pages'
}
```

**Генерация Description:**
```typescript
{
  type: 'progress',
  orderId: 123,
  processedUrls: 200,
  totalUrls: 200,
  status: 'PROCESSING',
  stage: 'description'
}
```

**Частота обновлений:** 
- **Позиция в очереди:** При изменении позиции (каждые 5-10 секунд или при изменении)
- **Обработка страниц:** После каждого батча страниц (размер батча согласно model.batchSize)
- При переходе к генерации description

**Расчет позиции в очереди:**

Позиция берется **из BullMQ напрямую**, не из базы данных:

```typescript
// Для конкретного Order получить позицию
const queue = getQueueByModelId(order.modelId);  // получить нужную очередь
const job = await queue.getJob(order.jobId);

if (!job) return null;

const state = await job.getState();

if (state === 'active') {
  // Order выполняется прямо сейчас
  return { status: 'PROCESSING', position: null };
}

if (state === 'waiting') {
  // Order ждет в очереди
  const waitingJobs = await queue.getWaiting();
  const position = waitingJobs.findIndex(j => j.id === job.id) + 1;
  return { status: 'QUEUED', position };
}
```

**Логика:**
- **Источник истины:** BullMQ queue state, не Order.status в БД
- **Active jobs:** Показать "Обрабатывается" (позиция не важна, т.к. выполняется)
- **Waiting jobs:** Показать реальную позицию в waiting list
- **Concurrency:** Автоматически учитывается (5 active = все обрабатываются параллельно)

**Пример с concurrency=5 (облачная очередь):**
- 5 Orders в состоянии `active` → все показывают "Обрабатывается"
- Order №6 в `waiting[0]` → позиция 1 (следующий)
- Order №7 в `waiting[1]` → позиция 2
- И т.д.

### 9.3 Обработка ошибок

**Требование:** 100% успешная обработка

**Если хотя бы ОДНА страница упала:**
- Прервать генерацию
- Order.status = FAILED
- Сохранить сообщения об ошибках в Order.errors
- Output не генерируется
- Пользователь может запросить возврат

**Только при 100% успехе:**
- Order.status = COMPLETED
- Output генерируется
- Пользователь скачивает результат

### 9.4 Логика повторов

**Повторы BullMQ:**
- Максимум попыток: 3 (конфигурируемо)
- Экспоненциальная задержка
- Если все попытки провалились → Order.status = FAILED

**Повтор инициированный пользователем:**
- Не поддерживается в MVP
- Пользователь создает новый Order (новая оплата)

---

## 10. Интеграция платежей

### 10.1 Методы оплаты
- **Stripe Checkout:** Хостируемая страница оплаты
- **Stripe Payment Intent:** Встроенная форма оплаты

### 10.2 Флоу оплаты

```
1. POST /api/orders → Order создан, status = CREATED
2. Пользователь выбирает платную модель
3. POST /api/orders/{id}/start (modelId) → status = PENDING_PAYMENT
4. Фронт вызывает /payment/checkout или /payment/intent
5. API создает Stripe session/intent, сохраняет в Order
6. Пользователь завершает оплату в Stripe
7. Webhook/polling обновляет Order.status = PAID
8. Триггер очереди задач → status = QUEUED
```

### 10.3 Синхронизация статуса оплаты

**Основной механизм: Polling при запросе Orders**

**Нельзя полагаться на webhook** - он может не прийти, быть потерян, задержан.

**Стратегия:**
1. Пользователь запрашивает Order (`GET /api/orders/{id}`) или список Orders (`GET /api/orders`)
2. API находит Orders в статусе PENDING_PAYMENT
3. Для каждого такого Order:
   - Запросить Stripe API для проверки статуса сессии/платежа
   - Если статус = "complete" (оплачен):
     * Обновить Order.status = PAID
     * Автоматически поставить задание в очередь (status = QUEUED)
   - Если статус = "expired" (сессия истекла):
     * Создать новую Stripe Session/Payment Intent
     * Обновить Order.stripeSessionId ИЛИ stripePaymentIntentSecret (что использовалось)
     * Вернуть новую ссылку на оплату пользователю
   - Если статус = "open" (сессия активна, ожидает оплаты):
     * Вернуть существующую ссылку
4. Вернуть обновленный список Orders

**Принцип:** Stripe API сообщает статус сессии - мы используем эту информацию без собственных таймаутов.

**Webhook (опциональное ускорение):**
- Stripe webhook при успешной оплате может ускорить процесс
- При получении webhook:
  * Обновить Order.status = PAID
  * Поставить задание в очередь немедленно
- Пользователь получит результат быстрее
- НО система работает корректно даже без webhook

**Гарантия:** Polling при каждом запросе списка гарантирует, что платежи будут обработаны, даже если webhook не пришел.

### 10.4 Процесс возврата

**Условия:**
- Order.status = FAILED
- Оплата завершена
- Задание удалено из очереди

**Флоу:**
1. Пользователь кликает "Запросить возврат"
2. API валидирует условия
3. Получить Stripe Payment Intent ID
4. Создать Stripe Refund
5. Обновить Order.status = REFUNDED
6. Вернуть подтверждение возврата

**Нет автоматических возвратов** - всегда инициируется пользователем

---

## 11. Аутентификация и авторизация

### 11.1 Метод аутентификации
**Magic Link (Email без пароля)**

1. Пользователь вводит email
2. Система отправляет email со ссылкой для входа
3. Пользователь кликает ссылку → аутентифицирован
4. Сессия создана

**ВАЖНО:** Magic link должен быть открыт в том же браузере, где был создан Order. Между браузерами ничего не синхронизируется (sessionId должен совпадать).

**Нет паролей, нет OAuth** (в MVP)

### 11.2 Анонимные пользователи
- Идентификация на основе сессии (sessionId)
- Могут создавать Orders ТОЛЬКО для бесплатных моделей (baseRate = 0)
- Платные модели (baseRate > 0) требуют авторизации
- Orders привязаны к sessionId

**Флоу перехода анонимный → авторизованный:**

1. **Анонимный пользователь вводит hostname:**
   - Система создает Order в статусе CREATED с sessionId
   - Извлекает контент, создает снапшот
   - Рассчитывает цену

2. **Пользователь выбирает платную модель:**
   - Система проверяет авторизацию
   - Если НЕ авторизован → редирект на страницу логина
   - Order остается в статусе CREATED с sessionId

3. **Пользователь логинится (magic link):**
   - Создается User entity с userId
   - Сессия теперь привязана к userId

4. **Редирект обратно на страницу:**
   - API автоматически переносит Orders: `WHERE sessionId = current_session AND userId IS NULL`
   - Обновляет: `SET userId = current_user_id`
   - Пользователь видит свой Order в списке генераций в статусе CREATED
   - Может продолжить с оплаты

**Что видит пользователь после логина:**
- Свой Order уже в истории (hostname, статус = CREATED)
- Пользователь выбирает модель → вызов `/start` → если статус = PENDING_PAYMENT, появляется кнопка "Оплатить"
- Кнопка "Оплатить" запрашивает ссылку на оплату (`/payment/checkout` или `/payment/intent`)
- Все данные сохранены, не нужно вводить hostname заново

### 11.3 Авторизация
- Пользователи видят ТОЛЬКО свои Orders
- Фильтр по: `userId = current` ИЛИ `sessionId = current`
- Нет межпользовательского доступа
- Нет админ-панели в MVP

---

## 12. Нефункциональные требования

### 12.1 Производительность
- **Фаза анализа:** ~40 секунд для 1 000 000 страниц (текущая реализация)
  - Масштабируемость: линейная зависимость от количества страниц
  - Для типичных сайтов (100-10000 страниц): < 5 секунд
- **Генерация:** Зависит от LLM-провайдера (~1-5 сек на страницу)
- **Обновления прогресса:** Реальное время через WebSocket (< 1 сек задержки)
- **Ответ API:** < 500мс для не-генерационных эндпоинтов

### 12.2 Надежность
- **SLA:** 90% uptime
- **Долговечность данных:** 99.9% (MySQL бэкапы)
- **Отказ Redis:** Плавная деградация (регенерация саммари)

### 12.3 Масштабируемость
- **Размер сайта:** Нет жесткого лимита на количество страниц
- **Обрезка контента:** 
  - **Контент =** исходный код страницы, очищенный от всех HTML-тегов и JavaScript
  - **Лимит:** Первые 3000 слов на страницу
  - **Обрезка:** По границе слова (не резать слово посередине)
  - Применяется при извлечении контента (до сохранения в ContentStore)
- **Одновременные пользователи:** 100+ одновременных генераций
- **Хранилище:** Растет сублинейно через дедупликацию

### 12.4 Безопасность
- **Данные платежей:** Никогда не хранятся (обрабатывает Stripe)
- **Контент:** Контент пользователя изолирован (без разделения)
- **API:** Rate limiting, CORS, CSRF защита
- **Сессии:** HTTP-only cookies, secure флаги

---

## 13. Скоуп MVP и исключения

### 13.1 В скоупе (MVP)
✅ Magic link аутентификация  
✅ Создание Order со снапшотом  
✅ Несколько провайдеров (минимум Gemini, Ollama)  
✅ Интеграция Stripe платежей  
✅ Отслеживание прогресса в реальном времени  
✅ История Orders  
✅ Ручные возвраты  
✅ Дедупликация контента  
✅ Redis кэш для саммари  

### 13.2 Вне скоупа (Будущее)
❌ OAuth аутентификация  
❌ Админ-панель  
❌ Webhooks для завершения генерации  
❌ Запланированная ре-генерация  
❌ Автоматические возвраты  
❌ Повтор инициированный пользователем (без новой оплаты)  
❌ Публичные ссылки на Orders  

---

## 14. Метрики успеха

### 14.1 Продуктовые метрики
- **Конверсия:** Анализ → Оплата → Завершение
- **Распределение провайдеров:** Использование бесплатных vs платных моделей
- **Средняя стоимость Order:** Выручка на генерацию
- **Повторы:** Пользователи генерирующие несколько сайтов

### 14.2 Технические метрики
- **Cache Hit Rate:** Эффективность Redis кэша саммари
- **Коэффициент дедупликации:** Экономия ContentStore
- **Процент успеха генерации:** COMPLETED / (COMPLETED + FAILED)
- **Среднее время генерации:** По провайдеру, по размеру сайта

### 14.3 Метрики качества
- **Процент возвратов:** REFUNDED / PAID Orders
- **Удовлетворенность пользователей:** Опрос после генерации (будущее)

---

## 15. Открытые вопросы и риски

### 15.1 Технические риски
- **Большие сайты:** 10,000+ страниц могут вызвать таймаут или исчерпать память
  - **Смягчение:** Обрезка контента, потоковая обработка
- **Лимиты LLM API:** Throttling провайдера
  - **Смягчение:** Backpressure очереди, логика повторов
- **Рост хранилища:** ContentStore может расти бесконечно
  - **Смягчение:** Агрессивная TTL очистка, мониторинг

### 15.2 Бизнес-риски
- **Цена слишком низкая:** Затраты на LLM превышают выручку
  - **Смягчение:** Мониторинг unit economics, корректировка цен
- **Злоупотребление бесплатной моделью:** Пользователи используют только бесплатные провайдеры
  - **Смягчение:** Ограничить качество бесплатной модели, добавить rate limits

### 15.3 Открытые вопросы

_На данный момент все вопросы решены._

---

## Приложение A: Примеры сценариев

### Сценарий 1: Первый пользователь (платный провайдер)
```
1. Пользователь заходит на сайт, вводит "https://example.com"
2. POST /api/orders проверяет robots.txt и sitemap.xml ✔
3. API анализирует сайт (30 сек) и возвращает:
   - Order (id=1, hostname="example.com", status=CREATED, totalUrls=150)
   - availableModels array с ценами за эту генерацию
4. Пользователь выбирает Gemini (€1.50) — платная модель
5. Фронт проверяет авторизацию → пользователь НЕ авторизован
6. Редирект на страницу логина (magic link)
7. Пользователь вводит email, получает ссылку, логинится
8. После логина редирект обратно на страницу Order
9. POST /api/orders/1/start (modelId="gemini-1.5-pro"):
   - Фиксирует модель и цену в Order
   - Возвращает Order с новым статусом
10. Фронт вызывает POST /api/orders/1/payment/checkout
11. API создает Stripe session и возвращает checkoutUrl
12. Пользователь переходит по checkoutUrl и оплачивает
13. Оплата завершена → Order.status = PAID → QUEUED → PROCESSING
14. Прогресс в реальном времени: "Обработка 0/150 → 150/150 → Генерация Description"
15. Order.status = COMPLETED
16. Скачивание llms.txt
```

### Сценарий 1б: Сайт без sitemap/robots
```
1. Пользователь вводит "https://bad-site.com"
2. API проверяет наличие robots.txt ✔, sitemap.xml ✘
3. API возвращает ошибку: "Сайт не имеет sitemap.xml"
4. Order НЕ создается
```

### Сценарий 2: Повторный пользователь (бесплатный провайдер)
```
1. Пользователь залогинен, вводит "https://another-site.com"
2. POST /api/orders → анализ, Order создан (status=CREATED, totalUrls=50)
3. Пользователь выбирает "Llama 3 (Локально)" (бесплатно)
4. POST /api/orders/{id}/start (modelId="llama3-local") → Order.status = QUEUED
5. Генерация начинается немедленно → Order.status = PROCESSING
6. Показывается прогресс в реальном времени
7. Завершено, скачивание доступно
```

### Сценарий 3: Неудачная генерация + Возврат
```
1. Пользователь оплатил генерацию
2. Генерация запускается → одна из страниц недоступна
3. Ошибка обработки → Order.status = FAILED
4. Пользователь видит "Генерация провалилась" с деталями ошибки
5. Пользователь кликает "Запросить возврат"
6. Система валидирует → создает Stripe refund
7. Order.status = REFUNDED
8. Пользователь получает деньги обратно
```

### Сценарий 4: Оптимизация переиспользования контента
```
10:00 - User A: example.com
  - page1.html → hash(X1) → ContentStore, Redis MISS → LLM
  - page2.html → hash(X2) → ContentStore, Redis MISS → LLM

10:30 - User B: example.com (сайт не изменился)
  - page1.html → hash(X1) → ContentStore (refCount=2), Redis HIT!
  - page2.html → hash(X2) → ContentStore (refCount=2), Redis HIT!
  - User B платит полную цену, но нет вызовов LLM (прибыль для сервиса)

12:00 - Сайт обновляет page1.html
14:00 - User C: example.com
  - page1.html → hash(Y1) НОВЫЙ! → ContentStore, Redis MISS → LLM
  - page2.html → hash(X2) ТОТ ЖЕ → ContentStore (refCount=3), Redis HIT!
```

---

**Конец PRD**
