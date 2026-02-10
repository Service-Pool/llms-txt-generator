# Plan: WebSocket Refactoring

## Problem
Currently WebSocket sends custom events (`OrderProgressEvent`, `OrderCompletionEvent`) instead of the same DTOs that HTTP API returns. This creates:
- Data structure duplication
- Complex mapping logic  
- Inconsistency between HTTP and WebSocket responses
- Multiple sources of truth

## Solution
**WebSocket should send the same `OrderResponseDto` that HTTP API returns.**

## Architecture Changes

### Backend (API)

#### 1. Remove Custom WebSocket Events
- Remove `OrderProgressEvent` and `OrderCompletionEvent` classes
- Keep only `WebSocketEvent.ORDER_UPDATE` 

#### 2. Update QueueEventsService
- Instead of parsing progress data, fetch full `OrderResponseDto` from database
- Send complete order object via WebSocket
- Use existing `OrdersService.getById()` to maintain consistency

#### 3. Update WebSocketService  
- Replace `sendProgress()` and `sendCompletion()` with single `sendOrderUpdate(orderDto)`
- Send `OrderResponseDto` in WebSocket message data

#### 4. Update OrderJobHandler
- Still call `job.updateProgress()` for BullMQ internal tracking
- QueueEventsService will handle WebSocket broadcasting

### Frontend (UI)

#### 5. Simplify OrderWebSocketStore
- Remove `OrderProgressEvent` and `OrderCompletionEvent` handling
- Handle single `ORDER_UPDATE` event with `OrderResponseDto`
- Direct call to `ordersStore.updateOrder(orderDto)` - no mapping needed

#### 6. Update WebSocket Message Handling
- Parse `OrderResponseDto` from WebSocket message
- Pass complete DTO to `ordersStore.updateOrder()`

## Files to Change

### Backend
- `apps/api/src/modules/websocket/websocket.events.ts` - Remove progress/completion events
- `apps/api/src/modules/queue/services/queue-events.service.ts` - Fetch full order, send DTO
- `apps/api/src/modules/websocket/services/websocket.service.ts` - Single sendOrderUpdate method
- `apps/api/src/enums/websocket-event.enum.ts` - Keep only ORDER_UPDATE event

### Frontend  
- `apps/ui/src/lib/stores/orderWebSocket.store.svelte.ts` - Simplified event handling
- Remove imports of `OrderProgressEvent`, `OrderCompletionEvent`

## Benefits
- ✅ Single source of truth: `OrderResponseDto`
- ✅ No data mapping/conversion logic
- ✅ Consistent API responses (HTTP = WebSocket)  
- ✅ Simplified code maintenance
- ✅ Easier testing and debugging
- ✅ Future-proof: any new order fields automatically included

## Implementation Order
1. Backend: Update WebSocket events and services
2. Backend: Update enum and remove old event classes
3. Frontend: Update WebSocket store to handle simplified events
4. Test end-to-end flow
5. Remove dead code and old imports