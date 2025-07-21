---
inclusion: always
---

# Clean Architecture Guidelines

## Core Dependency Rule
**Source code dependencies MUST point inward only**
- Inner layers define interfaces; outer layers implement them
- High-level modules never depend on low-level modules
- Both depend on abstractions, not concretions

## Layer Structure
```
Entities (Game Rules) → Use Cases (Game Logic) → Controllers/Presenters → UI/Framework
```

### For AI Mafia Game:
- **Entities**: Game rules, player states, AI character definitions
- **Use Cases**: Start game, make vote, AI decision-making, game flow
- **Adapters**: React components, API routes, AI service integrations
- **Framework**: Next.js, React, Gemini API, Zustand

## Implementation Rules

### File Organization
```
src/
├── domain/           # Entities & business rules
│   ├── entities/     # Core game objects
│   └── rules/        # Game logic
├── usecases/         # Application business logic
├── adapters/         # Interface implementations
│   ├── controllers/  # API route handlers
│   ├── presenters/   # React components
│   └── gateways/     # External service adapters
└── infrastructure/   # Frameworks & drivers
```

### Dependency Direction
```
❌ WRONG: domain/ imports from adapters/
✅ CORRECT: adapters/ imports from domain/
```

### AI Integration Pattern
- AI services (Gemini) stay in infrastructure layer
- Game logic defines AI behavior interfaces
- AI adapters implement these interfaces
- Core game rules remain AI-agnostic

## Code Standards

### Business Logic Protection
- Game rules live in `src/domain/` only
- No React/Next.js imports in domain layer
- AI character logic separated from AI service calls
- Use dependency injection for external services

### Interface Design
- Define interfaces in inner layers
- Keep interfaces focused and role-specific
- AI character interfaces separate from game interfaces
- Mock external dependencies for testing

### Error Handling
- Game rule violations = domain exceptions
- AI service failures = infrastructure exceptions
- Handle errors at appropriate boundaries

## Prohibited Patterns
- Game logic in React components
- Direct AI API calls from use cases
- Framework dependencies in domain layer
- Mixing UI state with game state
- Business rules in API route handlers

## Testing Strategy
- Unit test game rules without React/AI services
- Mock AI responses for game logic tests
- Integration tests at adapter boundaries
- E2E tests for complete user flows

## Quick Validation
Before implementing features:
- [ ] Game rules isolated from UI/AI services
- [ ] Dependencies point inward
- [ ] Interfaces defined by inner layers
- [ ] External services mockable for tests
- [ ] Business logic framework-agnostic