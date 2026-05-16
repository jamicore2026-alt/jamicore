# Latest Package Versions (April 2026)

```json
{
  "dependencies": {
    "fastify": "^5.8.4",
    "fastify-plugin": "^5.1.0",
    "@fastify/jwt": "^10.0.0",
    "@fastify/cors": "^11.2.0",
    "@fastify/cookie": "^11.0.2",
    "@fastify/rate-limit": "^10.3.0",
    "@fastify/swagger": "^9.7.0",
    "@fastify/swagger-ui": "^5.2.5",
    "@fastify/helmet": "^13.0.2",
    "@fastify/compress": "^8.3.1",
    "@fastify/sensible": "^6.0.4",
    "drizzle-orm": "^0.45.2",
    "postgres": "^3.4.9",
    "zod": "^4.0.0",
    "bcrypt": "^6.0.0",
    "bullmq": "^5.73.5",
    "ioredis": "^5.6.1",
    "file-type": "^22.0.0",
    "resend": "^6.11.0",
    "dotenv": "^17.4.2"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.8.0"
  }
}
```

## Important Version Notes

- **Zod 4.0.0**: Released July 2025. Has breaking changes - unified error API, new metadata system
- **file-type v22**: Requires Node.js 22+. Use v20.5.0 if on Node 20
- **resend v6**: 2 major versions ahead of v4 - check migration guide
- **bullmq v5.73**: Significant updates from v5.0 - new features for job deduplication