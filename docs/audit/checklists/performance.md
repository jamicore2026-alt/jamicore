# Performance Audit Checklist

## Database
- [ ] No N+1 queries in list endpoints
- [ ] Pagination on all list endpoints (limit/offset or cursor)
- [ ] Frequently queried columns have indexes
- [ ] Foreign keys have indexes
- [ ] Full-text search uses appropriate indexes
- [ ] No `SELECT *` when only specific columns needed
- [ ] Expensive queries use query timeout
- [ ] Connection pooling configured (min/max pool size)

## Caching
- [ ] Hot data cached in Redis (product lists, categories, settings)
- [ ] Cache keys are namespaced by tenant
- [ ] Cache invalidation on mutation (write-through or explicit)
- [ ] No cache stampede on popular keys
- [ ] TTL values are reasonable (not too short, not too long)

## Background Jobs
- [ ] BullMQ queues have concurrency limits
- [ ] Jobs have retry logic with backoff
- [ ] Failed jobs go to dead letter queue
- [ ] Long-running jobs don't block queue
- [ ] Job processors are idempotent

## Frontend
- [ ] Images use appropriate sizes and lazy loading
- [ ] JavaScript bundles are code-split
- [ ] API calls use pagination, not unbounded lists
- [ ] No memory leaks in Svelte stores
- [ ] Event listeners properly cleaned up

## API Design
- [ ] Response payloads are minimal
- [ ] No deeply nested includes unless needed
- [ ] Compression enabled (gzip/brotli)
- [ ] ETags or Last-Modified for cacheable responses
