# Technology Stack

## Core Framework
- **Next.js 15**: App Router with React Server Components
- **React 19**: Latest React with concurrent features
- **TypeScript**: Strict typing with relaxed null checks for rapid development

## UI & Styling
- **Tailwind CSS**: Utility-first styling with custom design system
- **Shadcn UI**: Component library with Radix UI primitives
- **Framer Motion**: Animations and transitions
- **Lucide React**: Icon system
- **Next Themes**: Dark/light mode support

## State Management & Data
- **Zustand**: Lightweight state management
- **React Query (@tanstack/react-query)**: Server state management and caching
- **React Hook Form**: Form handling with Zod validation
- **Supabase**: Database and authentication

## AI & External Services
- **Google Gemini AI**: Primary AI engine for rule explanations
- **Google Custom Search API**: Web research capabilities
- **Cheerio**: Web scraping for research data

## Development Tools
- **ESLint**: Code linting (builds ignore linting errors)
- **TypeScript**: Configured with path aliases (@/*)
- **Turbopack**: Fast development builds

## Common Commands
```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# EasyNext CLI (Korean framework)
easynext lang ko     # Switch to Korean
easynext supabase    # Setup Supabase
easynext auth        # Setup authentication
```

## Key Libraries
- **es-toolkit**: Modern utility library (Lodash alternative)
- **date-fns**: Date manipulation
- **ts-pattern**: Pattern matching
- **LRU Cache**: Research result caching
- **Axios**: HTTP client for external APIs