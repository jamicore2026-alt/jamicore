# Code Quality Audit Checklist

## Type Safety
- [ ] No `any` types without comment justification
- [ ] No unsafe `as` casts without guard
- [ ] Strict TypeScript enabled (`strict: true`)
- [ ] Return types declared on public functions
- [ ] Shared types in `shared-types` package, not duplicated

## Error Handling
- [ ] Consistent error class hierarchy used
- [ ] All async operations have try/catch or `.catch()`
- [ ] Errors logged with sufficient context (requestId, userId)
- [ ] No swallowed errors (empty catch blocks)
- [ ] Business errors return proper HTTP status codes

## Code Duplication
- [ ] No copy-pasted validation logic across routes
- [ ] Shared utilities used instead of inline implementations
- [ ] Repository patterns are consistent across modules
- [ ] Response formatting is centralized

## Dead Code
- [ ] No unused imports
- [ ] No commented-out code blocks
- [ ] No unreachable branches
- [ ] No exported functions that are never called

## Naming & Structure
- [ ] File names match exported entities
- [ ] Variable names describe purpose, not type
- [ ] Route files follow naming convention (`*.route.{scope}.ts`)
- [ ] Service/repo files under 400 lines
- [ ] Route files under 300 lines
- [ ] Schema files under 200 lines

## Dependencies
- [ ] No unused dependencies in package.json
- [ ] No deprecated package warnings
- [ ] No security vulnerabilities in `pnpm audit`
