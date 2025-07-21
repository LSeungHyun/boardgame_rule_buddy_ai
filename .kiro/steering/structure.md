# Project Structure

## Source Organization (`src/`)

### Core Application (`app/`)
- **App Router**: Next.js 15 app directory structure
- **API Routes**: `/api/` for server-side endpoints
- **Layout & Providers**: Global app configuration and context providers

### Components (`components/`)
- **UI Components**: Shadcn UI components in `ui/` subfolder
- **Feature Components**: Chat, game selection, feedback, research status
- **Component Naming**: PascalCase, descriptive names (e.g., `ChatMessage.tsx`, `GameSelection.tsx`)

### Business Logic (`lib/`)
- **Services**: Core business logic (gemini.ts, rule-master-service.ts)
- **AI Integration**: Gemini API, prompts, question analysis
- **Research System**: Web research, caching, rate limiting
- **Game Data**: Game mapping, terms, validation
- **Utilities**: Shared utility functions, error handling

### Data Management (`data/`)
- **Game Terms**: JSON files with board game terminology
- **Game Mapping**: Enhanced game data and compatibility mappings
- **Analysis Data**: Term discrepancies and game statistics

### Type Definitions (`types/`)
- **Domain Types**: Game, feedback, mapping, terms
- **Organized by Feature**: Each major feature has its own type file

### Custom Hooks (`hooks/`)
- **Reusable Logic**: Custom React hooks
- **UI Hooks**: Toast notifications, form handling

### Feature Modules (`features/`)
- **Domain-Specific**: Organized by business domain (games/)
- **Encapsulated**: Each feature contains its own components, hooks, and logic

## Configuration Files
- **components.json**: Shadcn UI configuration with path aliases
- **tsconfig.json**: TypeScript with strict mode and path mapping (@/*)
- **tailwind.config.ts**: Extended Tailwind with custom animations and colors

## Naming Conventions
- **Files**: PascalCase for components, kebab-case for utilities
- **Folders**: kebab-case for directories
- **Imports**: Use path aliases (@/components, @/lib, @/types)
- **API Routes**: RESTful naming in app/api/

## Key Patterns
- **Server Components**: Leverage React Server Components where possible
- **Client Components**: Mark with 'use client' when needed
- **Error Boundaries**: Comprehensive error handling throughout
- **Type Safety**: Strong typing with TypeScript, Zod validation
- **Caching**: LRU cache for research results, React Query for server state