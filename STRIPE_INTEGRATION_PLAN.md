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
2. Найти GenerationRequest
3. Обновить isPaid = true
4. ОТПРАВИТЬ В ОЧЕРЕДЬ queueService.addGenerationJob()

---

## Код

### Entity (generation-request.entity.ts):
```typescript
@Column({ nullable: true })
paymentLink: string | null;

@Column({ default: false })
isPaid: boolean;
```

### Entity (generation.entity.ts):
```typescript
// Добавить каскадное удаление при удалении Calculation
@ManyToOne(() => Calculation, calculation => calculation.generations, { nullable: true, onDelete: 'CASCADE' })
@JoinColumn({ name: 'calculation_id' })
public calculation: Relation<Calculation> | null;
```

### Controller (generation-requests.controller.ts):
```typescript
// 1. Получить Calculation
const calculation = await calculationsService.findByHostname(hostname);
const providerPrice = calculation.prices.find(p => p.provider === provider);
const frontendHost = this.configService.frontendHost;

// 2. Создать/найти Generation и связать с Calculation
const { generation, generationRequest } = await generationRequestService.findOrCreateGenerationRequest(hostname, provider);

// Связать Generation с Calculation если ещё не связано
if (!generation.calculationId) {
  generation.calculationId = calculation.id;
  await generationRepository.save(generation);
}

if (providerPrice.price.total > 0) {
  // Проверить существующую ссылку
  if (generationRequest.paymentLink) {
    const sessionId = generationRequest.paymentLink.split('/').pop();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete') {
      generationRequest.isPaid = true;
      await save();

      // Поставить в очередь
      const message = new GenerationJobMessage(
        generation.id,
        generationRequest.id,
        generation.provider
      );
      const jobId = JobUtils.generateId(generation.id);
      await this.queueService.send(providerConfig.queueName, message, jobId);

      return generationRequest;
    }

    if (session.status === 'open') {
      return { requiresPayment: true, paymentLink: generationRequest.paymentLink };
    }

    // status === 'expired' - создать новую Session ниже
  }

  // Создать новую Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: calculation.currency.toLowerCase(),
        product_data: {
          name: `Text Generation for ${hostname}`,
          description: `Provider: ${provider}`
        },
        unit_amount: Math.round(providerPrice.price.total * 100)
      },
      quantity: 1
    }],
    metadata: { generationRequestId, provider },
    success_url: `${frontendHost}/generations?success=true`,
    cancel_url: `${frontendHost}/generations?canceled=true`
  });

  generationRequest.paymentLink = session.url;
  await save();

  return { requiresPayment: true, paymentLink: session.url };
} else {
  // Бесплатный провайдер - сразу в очередь
  const message = new GenerationJobMessage(
    generation.id,
    generationRequest.id,
    generation.provider
  );
  const jobId = JobUtils.generateId(generation.id);
  await this.queueService.send(providerConfig.queueName, message, jobId);

  return generationRequest;
}
```

### Webhook (stripe.controller.ts):
```typescript
@Post('webhook')
async handleWebhook(
  @Headers('stripe-signature') signature: string,
  @RawBody() rawBody: Buffer
) {
  const sig = signature;

  // КРИТИЧЕСКИ ВАЖНО: Проверка подписи Stripe
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      this.configService.stripe.webhookSecret
    );
  } catch (err) {
    this.logger.error('Webhook signature verification failed', err.message);
    throw new BadRequestException('Invalid signature');
  }

  // Обработка события
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const { generationRequestId } = session.metadata;

      // Загрузить GenerationRequest с Generation
      const generationRequest = await generationRequestRepository.findOne({
        where: { id: generationRequestId },
        relations: ['generation']
      });

      const generation = generationRequest.generation;

      // Проверить существование Calculation через валидатор
      const calculationExists = await this.calculationValidator.validate(generation.hostname);
      if (!calculationExists) {
        this.logger.error(`Calculation not found for hostname ${generation.hostname}`);
        return { received: true };
      }

      if (!generationRequest.isPaid) {
        generationRequest.isPaid = true;
        await generationRequestRepository.save(generationRequest);

        // Поставить в очередь
        const generation = generationRequest.generation;
        const message = new GenerationJobMessage(
          generation.id,
          generationRequest.id,
          generation.provider
        );

        const providerConfig = this.configService.providers[generation.provider];
        const jobId = JobUtils.generateId(generation.id);

        await this.queueService.send(providerConfig.queueName, message, jobId);
      }
      break;
  }

  return { received: true };
}
```

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

- [x] Добавить FRONTEND_HOST в .env
- [x] Добавить frontendHost в ConfigService
- [x] Миграция БД: добавить paymentLink, isPaid в generation_requests
- [x] Миграция БД: добавить CASCADE в FK generation.calculationId
- [x] Обновить Entity (generation-request.entity.ts, generation.entity.ts)
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
FRONTEND_HOST=http://localhost:4200

Webhook endpoint: https://your-domain.com/api/stripe/webhook
Events: checkout.session.completed
