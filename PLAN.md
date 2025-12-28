# План: Функция анализа hostname

## Описание
Добавить предварительный шаг анализа hostname перед генерацией:
- Пользователь вводит hostname → анализ → показ количества URL
- Выбор провайдера (Бесплатно/Быстро) → генерация

## Изменение flow
**Текущий**: hostname + provider → генерация
**Новый**: hostname → анализ → показ количества → выбор provider → генерация

---

## Задачи

### API (Backend)

1. **DTOs** (`apps/api/src/shared/dtos/generation.dto.ts`)
   - [ ] Добавить `AnalyzeHostnameDto` (валидация запроса)
   - [ ] Добавить `HostnameAnalysisDto` (ответ с количеством URL)
   - [ ] Обновить exports

2. **Service** (`apps/api/src/generations/services/generations.service.ts`)
   - [ ] Добавить `Logger` в класс
   - [ ] Добавить `RobotsService` в конструктор
   - [ ] Добавить `SitemapService` в конструктор
   - [ ] Добавить метод `analyzeHostname(hostname): Promise<HostnameAnalysisDto>`

3. **Controller** (`apps/api/src/generations/generations.controller.ts`)
   - [ ] Добавить импорты новых DTOs
   - [ ] Добавить endpoint `GET /api/generations/analyze` (перед `@Get(':id')`)

### UI (Frontend)

4. **Config** (`apps/ui/src/lib/api/config.service.ts`)
   - [ ] Добавить `analyze` endpoint в конфигурацию

5. **Service** (`apps/ui/src/lib/api/generations.service.ts`)
   - [ ] Добавить импорт `HostnameAnalysisDto`
   - [ ] Добавить метод `analyze(hostname): Promise<ApiResponse<HostnameAnalysisDto>>`

6. **Environment** (`apps/ui/.devcontainer/mapped/.env.example`)
   - [ ] Увеличить `PUBLIC_HTTP_TIMEOUT` с 30000 до 180000

7. **Компоненты** - создать директорию `apps/ui/src/lib/components/features/generator/`
   - [ ] Создать `HostnameInput.svelte` (шаг 1: ввод hostname)
   - [ ] Создать `AnalysisProgress.svelte` (шаг 2: загрузка анализа)
   - [ ] Создать `ProviderSelection.svelte` (шаг 3: выбор провайдера)
   - [ ] Создать `GenerationProgress.svelte` (извлечь из существующего)
   - [ ] Создать `ErrorDisplay.svelte` (извлечь из существующего)
   - [ ] Создать `CompletedDisplay.svelte` (извлечь из существующего)

8. **Главный компонент** (`apps/ui/src/lib/components/features/LlmsTxtGenerator.svelte`)
   - [ ] Изменить тип `Stage` на `'input' | 'analysis' | 'provider_selection' | 'processing' | 'completed' | 'error'`
   - [ ] Добавить state `urlsCount: number`
   - [ ] Добавить функцию `handleCheckHostname(url: string)`
   - [ ] Обновить функцию `resetState()`
   - [ ] Рефакторинг template на использование новых компонентов

### Тестирование

9. **Тесты**
   - [ ] Протестировать недоступность robots.txt
   - [ ] Протестировать маленький сайт (быстрый анализ)
   - [ ] Протестировать большой сайт (анализ 1-2 минуты)
   - [ ] Протестировать выбор провайдера
   - [ ] Протестировать восстановление после ошибки

---

## Технические детали

- Переиспользование сервисов: `RobotsService.getSitemaps()` + `SitemapService.getUrlsStream()`
- Паттерн подсчета идентичен `countTotalUrls()` из `generation-job.handler.ts`
- Валидация идентична `CreateGenerationDto`
- Без кэширования и лимитов - считать все URL
- Timeout HTTP запроса: 3 минуты (может занять 30-120 секунд для больших сайтов)
