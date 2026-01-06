# Plan: Promo Statistics - "We totally generated XXX llms"

## Goal
Display total count of completed generations as promotional information for all users visiting the site, regardless of authentication or their activity. This is a promo statistic shown to everyone and can be extended with additional promo data in the future.

## Requirements
- Show "We totally generated XXX llms.txt files" prominently on the site
- Update in real-time when new generations complete
- Available to all users (authenticated or not)
- Not tied to specific user's generations

## Implementation Approach

### Backend Changes

#### 1. Create Promo Statistics Event
**File:** `apps/api/src/modules/websocket/websocket.events.ts`

Add new event class for promo stats:
```typescript
class PromoStatsEvent {
    constructor(
        public readonly totalCompleted: number
    ) {}
}

export { GenerationProgressEvent, GenerationStatusEvent, WebSocketMessage, PromoStatsEvent };
```

#### 2. Add REST Endpoint for Initial Stats
**File:** `apps/api/src/modules/stats/stats.controller.ts`

Add method to get current total completed count:
```typescript
@Get('promo')
public async promo(): Promise<ApiResponse> {
    const totalCompleted = await this.statsService.getPromoStats();
    return this.responseFactory.success({ totalCompleted });
}
```

#### 3. Add Service Method
**File:** `apps/api/src/modules/stats/stats.service.ts`

Add dependencies and method:
```typescript
import { Generation } from '../generations/entities/generation.entity';
import { GenerationStatus } from '../../enums/generation-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
class StatsService {
    constructor(
        private readonly robotsService: RobotsService,
        private readonly sitemapService: SitemapService,
        @InjectRepository(Generation)
        private readonly generationRepository: Repository<Generation>
    ) {}
    
    async getPromoStats(): Promise<number> {
        return await this.generationRepository.count({
            where: { status: GenerationStatus.COMPLETED }
        });
    }
}
```

#### 4. Update Stats Module
**File:** `apps/api/src/modules/stats/stats.module.ts`

Import Generation entity for TypeORM:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Generation } from '../generations/entities/generation.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { ApiResponse } from '../../utils/response/api-response';
import { RobotsModule } from '../robots/robots.module';
import { SitemapModule } from '../sitemap/sitemap.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Generation]),
        RobotsModule,
        SitemapModule
    ],
    controllers: [StatsController],
    providers: [StatsService, ApiResponse],
    exports: [StatsService]
})
export class StatsModule {}
```

#### 5. Create TypeORM Subscriber for Generation Entity
**File:** `apps/api/src/modules/generations/subscribers/generation.subscriber.ts` (NEW)

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { Generation } from '../entities/generation.entity';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { PromoStatsEvent } from '../../websocket/websocket.events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    EntitySubscriberInterface,
    EventSubscriber,
    UpdateEvent
} from 'typeorm';

@EventSubscriber()
@Injectable()
export class GenerationSubscriber implements EntitySubscriberInterface<Generation> {
    private readonly logger = new Logger(GenerationSubscriber.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
        @InjectRepository(Generation)
        private readonly generationRepository: Repository<Generation>
    ) {}

    listenTo() {
        return Generation;
    }

    async afterUpdate(event: UpdateEvent<Generation>): Promise<void> {
        const entity = event.entity as Generation;
        const databaseEntity = event.databaseEntity as Generation;

        // Check if status changed to COMPLETED
        if (
            entity?.status === GenerationStatus.COMPLETED &&
            databaseEntity?.status !== GenerationStatus.COMPLETED
        ) {
            this.logger.log(`Generation ${entity.id} completed, emitting promo stats`);

            // Count total completed
            const totalCompleted = await this.generationRepository.count({
                where: { status: GenerationStatus.COMPLETED }
            });

            // Emit promo stats event
            this.eventEmitter.emit('stats.promo', new PromoStatsEvent(totalCompleted));
        }
    }
}
```

#### 6. Register Subscriber in Generations Module
**File:** `apps/api/src/modules/generations/generations.module.ts`

```typescript
import { GenerationSubscriber } from './subscribers/generation.subscriber';

@Module({
    // ... existing config
    providers: [
        // ... existing providers
        GenerationSubscriber
    ]
})
```

#### 7. Add Promo Broadcast to WebSocket Gateway
**File:** `apps/api/src/modules/websocket/websocket.gateway.ts`

Add handler for promo stats event:
```typescript
@OnEvent('stats.promo')
handlePromoStats(event: PromoStatsEvent): void {
    this.logger.log(`Broadcasting promo stats: ${event.totalCompleted} completed`);
    this.broadcastPromo({
        type: 'stats:promo',
        payload: event
    });
}

private broadcastPromo(message: unknown): void {
    const messageStr = JSON.stringify(message);
    let totalSent = 0;
    
    // Send to all connected sockets across all rooms
    for (const clients of this.clients.values()) {
        for (const socket of clients) {
            try {
                socket.send(messageStr);
                totalSent++;
            } catch (error) {
                this.logger.error('Broadcast error:', error);
            }
        }
    }
    
    this.logger.log(`Promo broadcast sent to ${totalSent} clients`);
}
```

### Frontend Changes

#### 8. Create Promo Stats Store
**File:** `apps/ui/src/lib/stores/promo-stats.store.ts` (NEW)

```typescript
import { writable } from 'svelte/store';

export const promoStats = writable({
    totalCompleted: 0
});
```

#### 9. Update WebSocket Types
**File:** `apps/ui/src/lib/types/websocket.types.ts`

Add promo stats message type:
```typescript
export interface PromoStatsMessage extends WebSocketMessage {
    type: 'stats:promo';
    payload: {
        totalCompleted: number;
    };
}

export type PromoStatsListener = (event: PromoStatsMessage['payload']) => void;
```

#### 10. Update WebSocket Service
**File:** `apps/ui/src/lib/services/websocket.service.ts`

Add handler for promo stats messages:
```typescript
private handleMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data);
    
    if (message.type === 'stats:promo') {
        this.emit('promoStats', message.payload);
    }
    // ... existing handlers for progress, status
}
```

#### 11. Update Stats Service
**File:** `apps/ui/src/lib/api/stats.service.ts`

Add method to fetch promo stats:
```typescript
async getPromoStats(): Promise<{ totalCompleted: number }> {
    const response = await this.httpClient.get('/api/stats/promo');
    return response.getMessage().data;
}
```

#### 12. Create Promo Component
**File:** `apps/ui/src/lib/components/common/PromoStats.svelte` (NEW)

```svelte
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { promoStats } from '$lib/stores/promo-stats.store';
    import { WebSocketService } from '$lib/services/websocket.service';
    import { StatsService } from '$lib/api/stats.service';
    import { AppConfigService } from '$lib/api/config.service';
    
    const statsService = new StatsService();
    const configService = new AppConfigService();
    let ws: WebSocketService | null = null;
    
    const handlePromoStats = (event: { totalCompleted: number }) => {
        promoStats.set({ totalCompleted: event.totalCompleted });
    };
    
    onMount(async () => {
        // Load initial stats
        try {
            const stats = await statsService.getPromoStats();
            promoStats.set(stats);
        } catch (error) {
            console.error('Failed to load promo stats:', error);
        }
        
        // Connect to WebSocket for real-time updates
        ws = WebSocketService.getInstance(configService.websocket.url);
        ws.connect();
        ws.on('promoStats', handlePromoStats);
    });
    
    onDestroy(() => {
        if (ws) {
            ws.off('promoStats', handlePromoStats);
        }
    });
</script>

<div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg shadow-lg">
    <div class="text-center">
        <p class="text-sm opacity-90">We totally generated</p>
        <p class="text-3xl font-bold">{$promoStats.totalCompleted.toLocaleString()}</p>
        <p class="text-sm opacity-90">llms.txt files</p>
    </div>
</div>
```

#### 13. Add to Layout
**File:** `apps/ui/src/routes/(app)/+layout.svelte`

Import and display the component:
```svelte
<script>
    import PromoStats from '$lib/components/common/PromoStats.svelte';
    import Navigation from '$lib/components/common/Navigation.svelte';
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Navigation />
    
    <!-- Promo Stats -->
    <div class="max-w-4xl mx-auto mt-4 px-4">
        <PromoStats />
    </div>
    
    <main class="max-w-4xl mx-auto p-4">
        <slot />
    </main>
</div>
```

## Important Notes

⚠️ **TypeORM Subscriber Limitation:**
- TypeORM subscribers only fire when changes are made through TypeORM
- Direct SQL updates or changes from other applications **will not trigger** the subscriber
- The subscriber will work for updates made by this NestJS application

## Benefits
- Real-time updates for all users when generations complete via the app
- Promotional/social proof element
- Minimal performance impact
- REST endpoint for initial load

## Files to Create
1. `apps/api/src/modules/generations/subscribers/generation.subscriber.ts`
2. `apps/ui/src/lib/stores/promo-stats.store.ts`
3. `apps/ui/src/lib/components/common/PromoStats.svelte`

## Files to Modify
1. `apps/api/src/modules/websocket/websocket.events.ts`
2. `apps/api/src/modules/stats/stats.controller.ts`
3. `apps/api/src/modules/stats/stats.service.ts`
4. `apps/api/src/modules/stats/stats.module.ts`
5. `apps/api/src/modules/generations/generations.module.ts`
6. `apps/api/src/modules/websocket/websocket.gateway.ts`
7. `apps/ui/src/lib/types/websocket.types.ts`
8. `apps/ui/src/lib/services/websocket.service.ts`
9. `apps/ui/src/lib/api/stats.service.ts`
10. `apps/ui/src/routes/(app)/+layout.svelte`
