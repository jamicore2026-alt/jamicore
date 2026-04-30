# Bugs Audit Checklist

## Logic Errors
- [ ] Comparison operators correct (`===` not `==`, `!==` not `!=`)
- [ ] Off-by-one errors in pagination (limit + 1 for hasNextPage)
- [ ] Correct handling of 0, empty string, false as valid values
- [ ] Date comparisons use UTC consistently
- [ ] Currency calculations use integer cents, not floats

## Race Conditions
- [ ] Inventory decrements are atomic
- [ ] Coupon usage limits checked atomically
- [ ] Order status transitions are atomic
- [ ] Concurrent checkout for same item handled
- [ ] No check-then-act without transaction/locking

## Schema Mismatches
- [ ] Zod schemas match Drizzle table definitions
- [ ] API response types match frontend expectations
- [ ] Database defaults match application defaults
- [ ] Nullable columns handled correctly in Zod (`.nullable()`)

## Edge Cases
- [ ] Empty arrays handled gracefully in list endpoints
- [ ] Deleted records referenced by FK handled (soft delete or cascade)
- [ ] Very long inputs don't crash (max length validation)
- [ ] Special characters in names, descriptions handled
- [ ] Zero-quantity products don't break cart/checkout

## Validation Gaps
- [ ] All route handlers have Zod validation for body/query/params
- [ ] File upload routes validate file type and size
- [ ] Date ranges validated (start <= end)
- [ ] Numeric ranges validated (price >= 0, quantity > 0)
- [ ] Enum values validated against allowlist
- [ ] UUID format validated for all ID parameters
