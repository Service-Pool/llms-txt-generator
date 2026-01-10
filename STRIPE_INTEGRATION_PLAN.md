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

### 1. БД изменения:

**generation_requests:**
- paymentLink VARCHAR(500) NULL
- isPaid BOOLEAN DEFAULT false

**GenerationStatus enum:**
- Добавить PENDING_PAYMENT (ждет оплаты)

### 2. Логика создания

**Общее для всех провайдеров:**
1. Получить или создать Calculation для hostname
2. Связать Generation с Calculation (установить generation.calculationId)

**OLLAMA (цена = 0):**
- Generation.status = WAITING
- GenerationRequest.paymentLink = null
- Сразу в очередь
- Вернуть обычный GenerationRequestDtoResponse

**GEMINI (цена > 0):**
1. Проверить: есть paymentLink?
   - Да → проверить статус Session у Stripe:
     - Извлечь sessionId из URL: paymentLink.split('/').pop()
     - stripe.checkout.sessions.retrieve(sessionId)
     - Если status === "expired" → создать новую Session, установить status = PENDING_PAYMENT
     - Если status === "complete" → обновить isPaid=true, status = WAITING, запустить очередь
     - Если status === "open" → вернуть существующую ссылку, status = PENDING_PAYMENT
   - Нет → создать новую Session
2. Создать Checkout Session:
   - mode: 'payment'
   - amount: Math.round(price * 100)
   - currency: currency.toLowerCase()
   - metadata: {generationRequestId} (только ID, остальное достанем через relations)
   - success_url и cancel_url для фронтенда
3. Установить Generation.status = PENDING_PAYMENT
4. Сохранить paymentLink = session.url
5. НЕ отправлять в очередь
6. Вернуть обычный GenerationRequestDtoResponse (с status=PENDING_PAYMENT, paymentLink заполнен)

### 3. Webhook checkout.session.completed

1. Получить generationRequestId из metadata
2. Найти GenerationRequest (с relations: ['generation'])
3. Обновить isPaid = true
4. Обновить Generation.status = WAITING
5. ОТПРАВИТЬ В ОЧЕРЕДЬ queueService.send()

---

## Код

### Enum (stripe-session-status.enum.ts):
```typescript
enum StripeSessionStatus {
  COMPLETE = 'complete',
  OPEN = 'open',
  EXPIRED = 'expired'
}

export { StripeSessionStatus };
```

### Enum (generation-status.enum.ts):
```typescript
enum GenerationStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}
```

### Entity (generation-request.entity.ts):
```typescript
@Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_link' })
public paymentLink: string | null;

@Column({ type: 'boolean', default: false, name: 'is_paid' })
public isPaid: boolean;
```

### Entity (generation.entity.ts):
```typescript
// Добавить каскадное удаление при удалении Calculation (УЖЕ РЕАЛИЗОВАНО)
@ManyToOne(() => Calculation, calculation => calculation.generations, { nullable: false, onDelete: 'CASCADE' })
@JoinColumn({ name: 'calculation_id' })
public calculation: Relation<Calculation>;
```

### Service (generation-request.service.ts):
```typescript
/**
 * Найти или создать GenerationRequest
 * Если provider платный - создать Checkout Session, статус PENDING_PAYMENT
 * Если бесплатный - статус WAITING, сразу в очередь
 * Возвращает готовый DTO для ответа клиенту
 */
public async findOrCreateGenerationRequest(
  calculationId: number,
  provider: Provider
): Promise<GenerationRequestDtoResponse> {
  // 1. Найти или создать Generation
  const { generation, isNew: isNewGeneration } = await this.generationsService.findOrCreateGeneration(calculationId, provider);

  // 2. Получить цену для провайдера
  const calculation = generation.calculation;
  const providerPrice = calculation.prices.find(p => p.provider === provider);

  // 3. Если generation завершена - вернуть её
  if (generation.status === GenerationStatus.COMPLETED) {
    const { generationRequest } = await this.ensureGenerationRequest(generation.id, null);
    this.truncateContent(generation);
    generationRequest.generation = generation;
    return GenerationRequestDtoResponse.fromEntity(generationRequest);
  }

  // 4. Проверить: платный или бесплатный провайдер
  if (providerPrice.price.total === 0) {
    // Бесплатный - создать request и в очередь
    return await this.handleFreeProvider(generation, isNewGeneration);
  } else {
    // Платный - создать/проверить Checkout Session
    return await this.handlePaidProvider(generation, calculation, providerPrice, isNewGeneration);
  }
}

/**
 * Обработка бесплатного провайдера
 */
private async handleFreeProvider(generation: Generation, isNewGeneration: boolean): Promise<GenerationRequestDtoResponse> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { generationRequest, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, queryRunner);

    if (isNewGeneration || isNewRequest) {
      await this.queueJob(generation, generationRequest, generation.provider);
    }

    await queryRunner.commitTransaction();
    this.truncateContent(generation);
    generationRequest.generation = generation;
    return GenerationRequestDtoResponse.fromEntity(generationRequest);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Обработка платного провайдера
 */
private async handlePaidProvider(
  generation: Generation,
  calculation: Calculation,
  providerPrice: ProviderPrices,
  isNewGeneration: boolean
): Promise<GenerationRequestDtoResponse> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { generationRequest, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, queryRunner);

    // Проверить существующую paymentLink
    if (generationRequest.paymentLink) {
      const sessionId = generationRequest.paymentLink.split('/').pop()!;
      const session = await this.stripeService.retrieveSession(sessionId);

      if (session.status === StripeSessionStatus.COMPLETE) {
        // Оплачено - обновить isPaid, статус WAITING и в очередь
        generationRequest.isPaid = true;
        generation.status = GenerationStatus.WAITING;

        await queryRunner.manager.save(generationRequest);
        await queryRunner.manager.save(generation);

        if (isNewGeneration || isNewRequest) {
          await this.queueJob(generation, generationRequest, generation.provider);
        }

        await queryRunner.commitTransaction();
        this.truncateContent(generation);
        generationRequest.generation = generation;
        return GenerationRequestDtoResponse.fromEntity(generationRequest);
      }

      if (session.status === StripeSessionStatus.OPEN) {
        // Ссылка еще активна - статус PENDING_PAYMENT, вернуть её
        generation.status = GenerationStatus.PENDING_PAYMENT;
        await queryRunner.manager.save(generation);

        await queryRunner.commitTransaction();
        this.truncateContent(generation);
        generationRequest.generation = generation;
        return GenerationRequestDtoResponse.fromEntity(generationRequest);
      }

      // status === StripeSessionStatus.EXPIRED - создать новую Session ниже
    }

    // Создать новую Checkout Session
    const session = await this.stripeService.createCheckoutSession({
      generationRequestId: generationRequest.id,
      amount: providerPrice.price.total,
      currency: calculation.currency,
      hostname: calculation.hostname,
      provider: generation.provider
    });

    generationRequest.paymentLink = session.url;
    generation.status = GenerationStatus.PENDING_PAYMENT;

    await queryRunner.manager.save(generationRequest);
    await queryRunner.manager.save(generation);

    await queryRunner.commitTransaction();
    this.truncateContent(generation);
    generationRequest.generation = generation;
    return GenerationRequestDtoResponse.fromEntity(generationRequest);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Controller (generation-requests.controller.ts):
```typescript
@Post()
@HttpCode(HttpStatus.ACCEPTED)
public async create(
  @Body() createGenerationDto: CreateGenerationDtoRequest,
  @Req() httpRequest: FastifyRequest
): Promise<ApiResponse<MessageSuccess<GenerationRequestDtoResponse>>> {
  // Save session to DB
  await new Promise<void>((resolve, reject) => {
    httpRequest.session.save((err) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    });
  });

  // Calculation гарантированно существует благодаря CalculationValidator
  const calculation = await this.calculationsService.findByHostname(createGenerationDto.hostname);

  // Сервис возвращает готовый DTO
  const response = await this.generationRequestService.findOrCreateGenerationRequest(
    calculation!.id,
    createGenerationDto.provider
  );

  // Всегда возвращаем GenerationRequestDtoResponse
  // Если status = PENDING_PAYMENT и paymentLink != null - фронтенд покажет кнопку оплаты
  return this.apiResponse.success(response);
}
```

### Webhook (stripe.controller.ts):
```typescript
@Post('webhook')
async handleWebhook(
  @Headers('stripe-signature') signature: string,
  @RawBody() rawBody: Buffer
) {
  // КРИТИЧЕСКИ ВАЖНО: Проверка подписи Stripe
  let event;
  try {
    event = this.stripeService.constructWebhookEvent(rawBody, signature);
  } catch (err) {
    this.logger.error('Webhook signature verification failed', err.message);
    throw new BadRequestException('Invalid signature');
  }

  // Обработка события
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const generationRequestId = parseInt(session.metadata.generationRequestId);

      // Загрузить GenerationRequest с Generation
      const generationRequest = await this.generationRequestRepository.findOne({
        where: { id: generationRequestId },
        relations: ['generation']
      });

      if (!generationRequest) {
        this.logger.error(`GenerationRequest ${generationRequestId} not found`);
        return { received: true };
      }

      const generation = generationRequest.generation;

      // Идемпотентность: если уже оплачено, не делать повторно
      if (!generationRequest.isPaid) {
        generationRequest.isPaid = true;
        generation.status = GenerationStatus.WAITING;

        await this.generationRequestRepository.save(generationRequest);
        await this.generationRepository.save(generation);

        // Поставить в очередь
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

**Единообразный ответ для всех провайдеров:**
```json
{
  "code": "SUCCESS",
  "message": {
    "data": {
      "id": 123,
      "generationId": 45,
      "hostname": "https://mototechna.cz",
      "provider": "gemini",
      "status": "PENDING_PAYMENT", // или WAITING для бесплатных
      "paymentLink": "https://checkout.stripe.com/...", // или null для бесплатных
      ...
    }
  }
}
```

**OLLAMA (бесплатный):**
- status = WAITING
- paymentLink = null
→ Фронтенд показывает "In Queue" или "Processing"

**GEMINI (платный):**
- status = PENDING_PAYMENT
- paymentLink = "https://checkout.stripe.com/..."
→ Фронтенд показывает "Pending Payment" + кнопка "Pay"
→ Redirect на paymentLink (Checkout Session)
→ Stripe оплата
→ Webhook checkout.session.completed → status = WAITING → Очередь
→ WebSocket updates (статус меняется WAITING → ACTIVE → COMPLETED)

---

## Чек-лист

- [x] Добавить FRONTEND_HOST в .env
- [x] Добавить frontendHost в ConfigService
- [x] Миграция БД: добавить paymentLink, isPaid в generation_requests
- [x] Миграция БД: добавить CASCADE в FK generation.calculationId
- [x] Обновить Entity (generation-request.entity.ts, generation.entity.ts)
- [x] Логика связывания Generation с Calculation (делается в GenerationsService.findOrCreateGeneration)
- [x] Добавить PENDING_PAYMENT в enum GenerationStatus
- [x] Миграция БД: добавить 'PENDING_PAYMENT' в generation_status_enum
- [x] Рефакторинг: GenerationRequestService.findOrCreateGenerationRequest возвращает готовый DTO
- [x] Упростить Controller: убрать маппинг в DTO, сервис возвращает готовый ответ
- [x] Создать enum StripeSessionStatus для типизированных статусов вместо магических строк
- [ ] Создать StripeService с методами createCheckoutSession, retrieveSession, constructWebhookEvent
- [ ] Создать StripeModule
- [ ] Обновить GenerationRequestService: добавить handlePaidProvider и handleFreeProvider
- [ ] Создать StripeController с webhook обработчиком
- [ ] Обновить фронтенд: обработка статуса PENDING_PAYMENT + кнопка Pay
- [ ] Тест через stripe CLI

## Stripe настройки

.env:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_HOST=http://localhost:4200

Webhook endpoint: https://your-domain.com/api/stripe/webhook
Events: checkout.session.completed
