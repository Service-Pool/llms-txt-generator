# План интеграции Stripe

## Текущая ситуация

1. POST /api/generation-requests с {hostname, provider}
2. Валидация через CalculationValidator
3. Создание GenerationRequest в БД
4. Отправка в очередь queueService.addGenerationJob()
5. Worker обрабатывает

Таблица Calculations содержит prices:
[
  {provider: gemini, price: {total: 1148.18, perUrl: 0.00097}},
  {provider: ollama, price: {total: 0, perUrl: 0}}
]

---

## Новый флоу с оплатой

### 1. БД - добавить в generation_requests:
- paymentLink VARCHAR(500) NULL
- isPaid BOOLEAN DEFAULT false

### 2. Логика создания

**Общее для всех провайдеров:**
1. Получить или создать Calculation для hostname
2. Связать Generation с Calculation (установить generation.calculationId)

**OLLAMA (цена = 0):**
- Текущая логика без изменений
- Сразу в очередь

**GEMINI (цена > 0):**
1. Проверить: есть paymentLink?
   - Да → проверить статус Session у Stripe:
     - Извлечь sessionId из URL: paymentLink.split('/').pop()
     - stripe.checkout.sessions.retrieve(sessionId)
     - Если status === "expired" → создать новую Session
     - Если status === "complete" → обновить isPaid=true, запустить очередь
     - Если status === "open" → вернуть существующую ссылку
   - Нет → создать новую Session
2. Создать Checkout Session:
   - mode: 'payment'
   - amount: Math.round(price * 100)
   - currency: currency.toLowerCase()
   - metadata: {generationRequestId, hostname, provider}
   - success_url и cancel_url для фронтенда
3. Сохранить paymentLink = session.url
4. Вернуть {requiresPayment: true, paymentLink, amount, currency}
5. НЕ отправлять в очередь

### 3. Webhook checkout.session.completed

1. Получить generationRequestId из metadata
2. Найти GenerationRequest с relation к Generation
3. Проверить существование Calculation через CalculationValidator
4. Обновить isPaid = true
5. Создать GenerationJobMessage с параметрами (generationId, generationRequestId, hostname, provider)
6. Получить queueName из providerConfig
7. Поставить в очередь через queueService.send(queueName, message, jobId)

---

## Изменения в Entity

### generation-request.entity.ts:
- Добавить поле paymentLink (nullable)
- Добавить поле isPaid (default false)

### generation.entity.ts:
- Добавить каскадное удаление: onDelete: 'CASCADE' в relation к Calculation

---

## Реализация в Controller

### generation-requests.controller.ts:

**Шаги:**
1. Получить Calculation по hostname
2. Найти price для provider
3. Получить frontendUrl из config
4. Создать/найти Generation и GenerationRequest
5. Связать Generation с Calculation если не связано
6. Если цена > 0:
   - Проверить существующую paymentLink:
     - Извлечь sessionId
     - Проверить статус у Stripe
     - Если complete → обновить isPaid, поставить в очередь
     - Если open → вернуть существующую ссылку
     - Если expired → создать новую Session
   - Если нет ссылки → создать Checkout Session
   - Сохранить paymentLink
   - Вернуть {requiresPayment: true, paymentLink}
7. Если цена = 0:
   - Сразу поставить в очередь
   - Вернуть generationRequest

### stripe.controller.ts:

**Webhook endpoint:**
- Использовать @RawBody() для получения raw body
- Получить stripe-signature из headers
- Проверить подпись через stripe.webhooks.constructEvent()
- Обработать событие checkout.session.completed:
  - Загрузить GenerationRequest с Generation
  - Валидировать существование Calculation
  - Проверить isPaid
  - Обновить isPaid = true
  - Создать message для очереди
  - Поставить в очередь через queueService.send()
- Вернуть {received: true}

---

## Флоу для фронтенда

**OLLAMA:**
Request → Response: GenerationRequest → Показать Started

**GEMINI:**
Request → Response: {requiresPayment: true, paymentLink}
→ Показать Pay 1148.18 EUR + кнопка
→ Redirect на paymentLink (Checkout Session)
→ Stripe оплата
→ Webhook checkout.session.completed → Очередь
→ WebSocket updates

---

## Чек-лист

- [ ] Добавить FRONTEND_URL в .env
- [ ] Добавить frontendUrl в ConfigService
- [ ] Миграция БД: добавить paymentLink, isPaid в generation_requests
- [ ] Миграция БД: добавить CASCADE в FK generation.calculationId
- [ ] Обновить Entity (generation-request.entity.ts, generation.entity.ts)
- [ ] Логика связывания Generation с Calculation
- [ ] Логика создания Checkout Session в контроллере
- [ ] Логика проверки статуса Session
- [ ] Webhook обработчик checkout.session.completed
- [ ] Webhook проверка подписи stripe.webhooks.constructEvent
- [ ] Webhook валидация существования Calculation через CalculationValidator
- [ ] Добавить зависимости в StripeModule
- [ ] Тест через stripe CLI
- [ ] Обновить фронтенд

## Stripe настройки

.env:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:4200

Webhook endpoint: https://your-domain.com/api/stripe/webhook
Events: checkout.session.completed
