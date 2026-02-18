# План реализации Soft Delete для Orders

## Цель
Позволить пользователям удалять заказы из своего списка, но сохранять их в БД для аудита.

---

## Ключевое решение: TypeORM @DeleteDateColumn

Использовать встроенный механизм TypeORM для soft delete вместо ручной реализации.

### Преимущества:
- Автоматическая фильтрация удаленных записей во всех запросах
- Не требуется добавлять условия фильтрации вручную
- Встроенные методы softRemove, softDelete, restore, recover
- Явный контроль через withDeleted() где нужно получить удаленные записи

---

## 1. Backend: Database Schema

### 1.1. Добавить колонку deletedAt в Order entity
- Использовать декоратор DeleteDateColumn
- Тип datetime, nullable
- Автоматический индекс создается TypeORM

### 1.2. Миграция
- Выполняется вручную

---

## 2. Backend: Order Entity

### 2.1. Обновить Order entity
- Добавить свойство deletedAt с декоратором DeleteDateColumn
- Все методы find/findOne автоматически будут фильтровать deletedAt IS NULL

---

## 3. Backend: Orders Service

### 3.1. Добавить метод deleteOrder
- Проверить ownership через validateOwnership (НЕ getUserOrder - он синхронизирует Stripe)
- Валидация статуса - запретить удаление PROCESSING и QUEUED
- Вызвать softRemove для установки deletedAt
- Вернуть успешный ответ

### 3.2. Использовать validateOwnership для проверки ownership
- Проверка что заказ принадлежит текущему пользователю
- Без синхронизации со Stripe
- Без автоматической фильтрации deletedAt (использовать withDeleted: true)

---

## 4. Backend: Validators

### 4.1. Создать OrderCanBeDeletedValidator
- Путь: apps/api/src/validators/order.validator.ts
- Проверка что заказ можно удалить
- Валидация статуса: НЕ PROCESSING и НЕ QUEUED
- Валидация ownership: заказ принадлежит текущему пользователю
- Использовать в DTO для DELETE endpoint

---

## 5. Backend: Webhook Controller

### 5.1. Обновить handleWebhook
- В методе поиска заказа по stripeSessionId добавить опцию withDeleted: true
- Stripe может отправить webhook даже если заказ удален
- Обновить статус в БД но пользователь его не увидит

---

## 6. Backend: Orders Controller

### 6.1. Добавить endpoint DELETE /api/orders/:orderId
- SessionGuard для авторизации
- Swagger документация
- Вызов ordersService.deleteOrder
- Возврат ApiResponse.success

### 6.2. Обновить HATEOAS links
- Добавить HateoasAction.DELETE в enum
- Генерировать delete link для заказов которые можно удалить
- Условия: НЕ PROCESSING и НЕ QUEUED
- Только завершенные, упавшие, отмененные, ожидающие оплаты заказы

---

## 7. Backend: HATEOAS

### 7.1. Добавить DELETE action в enum
- В shared.ts добавить HateoasAction.DELETE

### 7.2. Обновить логику генерации links
- В OrderResponseDto добавлять delete link
- Для CREATED, CALCULATED, PENDING_PAYMENT, COMPLETED, FAILED, REFUNDED
- НЕ добавлять для PAID, QUEUED, PROCESSING (они в обработке или будут)

---

## 8. Frontend: Orders Service

### 8.1. Добавить метод deleteOrder
- DELETE запрос к /api/orders/:orderId
- Возврат ApiResponse

### 8.2. Обновить orders.store.svelte.ts
- Добавить метод removeOrderById
- Удалять заказ из items массива локально
- Обновлять total счетчик
- Опционально broadcast через BroadcastChannel

---

## 9. Frontend: UI Components

### 9.1. Обновить order-actions.config.ts
- Добавить конфигурацию для delete action
- id, icon TrashBinSolid, label, description, color red
- hateoasActions с DELETE

### 9.2. Создать DeleteAction.svelte
- Props: order, mode, loading
- Модальное окно подтверждения через Modal из Flowbite
- При подтверждении вызов ordersService.deleteOrder
- Обновление ordersStore
- Toast сообщение об успехе
- Редирект на /orders если на странице детального просмотра

### 9.3. Обновить _OrderActions.svelte
- Импорт DeleteAction компонента
- Условный рендеринг DeleteAction

### 9.4. Импорт иконки
- TrashBinSolid из flowbite-svelte-icons

---

## 10. Frontend: WebSocket обработка

### 10.1. Обработка обновлений удаленных заказов
- В socket.store.svelte.ts проверять наличие заказа перед обновлением
- Если заказ был удален локально - игнорировать WebSocket update
- Предотвращение race condition

---

## Этапы реализации (порядок)

1. **Backend Entity** - добавить @DeleteDateColumn
2. **Backend Migration** - выполнить вручную
3. **Backend Service** - deleteOrder с validateOwnership, валидация статусов
4. **Backend Validator** - OrderCanBeDeletedValidator
5. **Backend Webhook** - withDeleted: true
6. **Backend Controller** - DELETE endpoint
7. **Backend HATEOAS** - DELETE action и links
8. **Frontend Service** - deleteOrder метод и store
9. **Frontend UI** - DeleteAction с Modal из Flowbite
10. **Frontend Integration** - добавить в _OrderActions

---

## Потенциальные проблемы

### Race condition при WebSocket update
- Frontend проверяет наличие заказа перед обновлением store
- Игнорирование обновлений для удаленных заказов

### Webhook приходит после удаления
- Использование withDeleted: true в поиске
- Обновление статуса в БД происходит
- Пользователь не видит из-за автофильтрации

### Пользователь пытается удалить PROCESSING заказ
- Валидация в deleteOrder запрещает удаление
- BadRequestException с понятным сообщением
- HATEOAS не показывает delete link для PROCESSING/QUEUED

---

## Безопасность

- DELETE endpoint проверяет ownership
- SessionGuard обязателен
- Только владелец может удалить
- HATEOAS links показывают delete только если разрешено
- Валидация статуса перед удалением

---

## Производительность

- Автоматический индекс на deletedAt от TypeORM
- Мягкая фильтрация не влияет на производительность
