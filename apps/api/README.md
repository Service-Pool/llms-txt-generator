# LLMs.txt Generator API

NestJS-based API для автоматической генерации llms.txt файлов.

## Установка

```bash
npm install
```

## Запуск

```bash
# Development
npm run app:dev

# Production
npm run build
npm run app

# Generation Worker
npm run generation-worker:dev
```

## Миграции

```bash
# Генерация миграции
npm run migration:generate

# Запуск миграций
npm run migration:run

# Откат миграции
npm run migration:revert
```


## Rate Limiting

API использует ``@nestjs/throttler`` для защиты от DDoS атак и чрезмерного использования.

### Конфигурация

Настройка производится через переменные окружения:

```env
# Время в секундах для окна rate limit (по умолчанию: 60)
THROTTLE_TTL=60

# Максимальное количество запросов в окне TTL (по умолчанию: 10)
THROTTLE_LIMIT=10
```

**Примеры:**
- ``THROTTLE_TTL=60`` и ``THROTTLE_LIMIT=10`` = 10 запросов в минуту
- ``THROTTLE_TTL=3600`` и ``THROTTLE_LIMIT=1000`` = 1000 запросов в час

### Отключение для отдельных эндпоинтов

Для отключения rate limiting на конкретном эндпоинте используйте декоратор ``@SkipThrottle()``:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Post('webhook')
async handleWebhook() {
  // Этот эндпоинт не подвержен rate limiting
}
```

### Кастомные лимиты для эндпоинтов

Для установки индивидуальных лимитов используйте декоратор ``@Throttle()``:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('expensive-operation')
async expensiveOperation() {
  // Максимум 3 запроса в минуту для этого эндпоинта
}
```
