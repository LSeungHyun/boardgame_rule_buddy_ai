---
inclusion: always
---

# Development Workflow Guidelines

## Core Directive

For complex development tasks (new features, architecture changes, refactoring), follow this systematic three-phase approach to ensure code quality and project consistency.

## When to Apply

**Required for:**
- New feature development
- Bug fixes affecting multiple files
- Code refactoring and architecture changes
- Performance optimization work

**Not required for:**
- Simple documentation updates
- Minor styling adjustments
- Single configuration file changes

## Phase 1: Analysis & Discovery

### File Discovery
- Use `grepSearch` and `fileSearch` to locate relevant files
- Examine existing implementations for similar features
- Identify all files that may need modification

### Convention Analysis
- Document naming conventions (PascalCase components, camelCase hooks)
- Note architectural patterns (Clean Architecture, dependency injection)
- Identify styling approaches (Tailwind classes, component patterns)
- Review error handling and validation patterns

### Output Format
```
**Relevant Files:**
- path/to/file: purpose and relevance

**Conventions Identified:**
- Naming: specific patterns found
- Architecture: layer organization
- Patterns: common implementations
```

## Phase 2: Implementation Planning

### Planning Requirements
- Break work into logical modules/components
- Define specific, testable acceptance criteria
- Consider dependencies and integration points
- Plan for error handling and edge cases

### Output Format
```
## Implementation Plan

### Component: [Name]
**Purpose:** Brief description
**Tasks:**
- [ ] Specific implementation step
- [ ] Another specific step

**Acceptance Criteria:**
- [ ] Measurable success criterion
- [ ] Performance/quality requirement
```

## Phase 3: Implementation

### Quality Standards
- Follow established code conventions from Phase 1
- Implement minimal, focused solutions
- Validate each acceptance criterion
- Ensure proper TypeScript typing
- Add appropriate error handling

### Validation Checklist
- [ ] All acceptance criteria met
- [ ] Code follows project conventions
- [ ] TypeScript types are correct
- [ ] Error handling implemented
- [ ] Integration points tested

## AI Mafia Game Specific Guidelines

### Component Organization
- Game logic in `src/domain/` (Clean Architecture)
- UI components in `src/components/`
- AI integration in `src/adapters/gateways/`
- Shared utilities in `src/lib/`

### AI Integration Patterns
- Define AI behavior interfaces in domain layer
- Implement AI service adapters in infrastructure layer
- Keep game rules AI-service agnostic
- Handle AI failures gracefully with fallbacks

### State Management
- Use Zustand for game state
- React Query for server state
- Local state for UI-only concerns
- Maintain clean separation between layers

### Performance Considerations
- Target <200ms response times for game actions
- Implement proper loading states
- Use React.memo for expensive components
- Lazy load non-critical features