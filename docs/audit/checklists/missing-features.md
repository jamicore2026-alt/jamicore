# Missing Features Audit Checklist

## Incomplete Flows
- [ ] No TODO comments in production code
- [ ] No stub/placeholder route handlers
- [ ] No empty pages with "Coming Soon"
- [ ] All documented features have corresponding code

## Missing Validations
- [ ] Business rules enforced in code (e.g., max 1 active coupon per order)
- [ ] Unique constraints have application-level checks
- [ ] Required relations verified before mutation
- [ ] State machine transitions validated (e.g., pending -> confirmed, not cancelled -> pending)

## Missing Indexes
- [ ] All foreign keys have indexes
- [ ] Searchable text columns have indexes
- [ ] Frequently sorted columns have indexes
- [ ] Composite indexes for multi-column queries

## Missing Tests
- [ ] Every module has at least basic unit tests
- [ ] Auth flows have e2e tests
- [ ] Payment flows have e2e tests
- [ ] Critical business logic has integration tests

## Missing Documentation
- [ ] Complex SQL or Drizzle queries have comments
- [ ] Business rules documented in code or adjacent markdown
- [ ] Environment variables documented
- [ ] API breaking changes documented

## Missing Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Key metrics logged (order count, revenue, errors)
- [ ] Health check endpoint exists
- [ ] Queue depth monitored
