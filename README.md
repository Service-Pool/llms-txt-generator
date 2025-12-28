# LLMs.txt Generator

Монорепозиторий для генератора llms.txt файлов.

## Структура проекта

- **[apps/api](./apps/api/README.md)** - Backend API (NestJS)
- **[apps/ui](./apps/ui/README.md)** - Frontend UI (SvelteKit)

## Общие типы

Общие TypeScript типы и enum'ы находятся в `apps/api/src/shared/` и используются как в API, так и в UI через:
- API: `import { Provider } from '../shared/index.js'`
- UI: `import { Provider } from '@api/shared'` (через alias в svelte.config.js)

## Разработка

Каждое приложение имеет собственную документацию и инструкции по запуску. См. README в соответствующих папках.
