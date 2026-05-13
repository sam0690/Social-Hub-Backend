# Social Hub Backend Architecture Context

## Project Overview

I am building a production-grade social media backend called **Social Hub** using:

- NestJS
- TypeScript
- PostgreSQL
- Redis
- Drizzle ORM
- JWT Authentication
- Docker

---

# Current Infrastructure

## Backend Stack

- NestJS project with TypeScript
- PostgreSQL running on port `5433` via Docker
- Redis running on port `6380` via Docker

---

# Database Layer

## Drizzle ORM Configuration

Drizzle ORM is configured with a global `DRIZZLE` token injected via `DatabaseModule`.

### Important Details

- `DatabaseModule` is marked with `@Global()`
- Reads `DATABASE_URL` directly from environment variables using:

```ts
config.getOrThrow('DATABASE_URL')
```

---

# Redis Layer

## Cache Module

Redis is configured via `CacheModule`.

### Important Details

- `CacheModule` is marked with `@Global()`
- Reads:
  - `REDIS_HOST`
  - `REDIS_PORT`

directly from environment variables.

---

# Config System

## Global Config Module

Config module is loaded globally with:

- `appConfig`
- `databaseConfig`
- `redisConfig`
- `authConfig`

---

# Environment Validation

## Custom Environment Validation

Custom `validateEnv` function exists in:

```txt
src/config/env.ts
```

It validates all required environment variables on startup.

### Helper Functions

Also available:

- `getRequiredEnv`
- `getOptionalEnv`

Location:

```txt
src/config/env.ts
```

---

# Environment Variables

## .env

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/socialhub_dev"

REDIS_HOST=localhost
REDIS_PORT=6380

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

---

# Swagger Configuration

Swagger is installed and configured in `main.ts`.

## Features

- Uses `addBearerAuth`
- Bearer auth name:

```txt
access-token
```

- `persistAuthorization: true`
  - Keeps token after page refresh

---

# Swagger Decorator System

## Global Swagger Decorators

Location:

```txt
src/common/decorators/swagger.decorators.ts
```

Exports:

### ApiAuthEndpoint(summary, responses?)

Used for JWT protected routes.

Includes:

```ts
@ApiBearerAuth()
```

internally.

---

### ApiPublicEndpoint(summary, responses?)

Used for public routes.

---

## Supported Response Status Codes

Both decorators support optional response descriptions for:

- `200`
- `201`
- `400`
- `403`
- `404`
- `409`

---

# Swagger Rules

## Always Follow These Rules

### Controllers

Always add:

```ts
@ApiTags('ModuleName')
```

on controller classes.

---

### DTOs

Always add:

```ts
@ApiProperty({ example: '...' })
```

on all DTO fields.

---

### Never Import Raw Swagger Decorators

Never import directly:

- `@ApiOperation`
- `@ApiBearerAuth`
- `@ApiResponse`

Use only the custom swagger decorators.

---

# Database Schema (Drizzle)

## users Table

Fields:

- id
- username
- email
- passwordHash
- displayName
- bio
- avatarUrl
- bannerUrl
- isVerified
- isPrivate
- role (`USER | MODERATOR | ADMIN`)
- status (`ACTIVE | BANNED | SUSPENDED`)
- lastSeenAt
- createdAt
- updatedAt
- deletedAt

---

## sessions Table

Stores hashed refresh tokens per user.

Fields include:

- ipAddress
- userAgent
- expiresAt
- revokedAt

---

## email_verifications Table

Stores hashed email verification tokens.

Fields include:

- expiresAt
- usedAt

---

## password_resets Table

Stores hashed password reset tokens.

Fields include:

- expiresAt
- usedAt

---

# Schema Exports

All schemas are exported from:

```txt
src/database/schema/index.ts
```

---

# Authentication Module

## Location

```txt
src/modules/auth/
```

## Status

Fully built and tested.

---

# Auth Endpoints

## Register

```http
POST /api/v1/auth/register
```

Registers a user and returns:

- user
- accessToken
- refreshToken

---

## Login

```http
POST /api/v1/auth/login
```

Validates credentials and returns tokens.

---

## Refresh Token

```http
POST /api/v1/auth/refresh
```

Protected using:

```ts
JwtRefreshGuard
```

Rotates refresh token.

---

## Logout

```http
POST /api/v1/auth/logout
```

Protected using:

```ts
JwtAuthGuard
```

Revokes all user sessions.

---

## Forgot Password

```http
POST /api/v1/auth/forgot-password
```

Generates hashed reset token with 15 minute expiry.

---

## Reset Password

```http
POST /api/v1/auth/reset-password
```

Features:

- validates token
- hashes new password
- revokes all sessions

---

## Current User

```http
GET /api/v1/auth/me
```

Protected using:

```ts
JwtAuthGuard
```

Returns current user without `passwordHash`.

---

# Authentication Details

## Password Hashing

Uses:

```txt
argon2
```

---

## Guards

Located in:

```txt
src/modules/auth/guards/
```

Includes:

- `JwtAuthGuard`
- `JwtRefreshGuard`

---

## JWT Strategies

Located in:

```txt
src/modules/auth/strategies/
```

---

## Repository Pattern

`AuthRepository` handles all database queries.

Services never query the database directly.

---

# TypeScript Configuration

## tsconfig.json

```json
{
  "module": "nodenext",
  "moduleResolution": "nodenext",
  "emitDecoratorMetadata": true,
  "experimentalDecorators": true
}
```

### Notes

- No `baseUrl`
- Imports are relative

---

# Folder Structure

```txt
src/
├── common/
│   └── decorators/
│       └── swagger.decorators.ts
│
├── config/
│   ├── app.config.ts
│   ├── auth.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── env.ts
│   └── index.ts
│
├── database/
│   ├── database.module.ts
│   └── schema/
│       ├── users.ts
│       ├── sessions.ts
│       ├── email-verifications.ts
│       ├── password-resets.ts
│       └── index.ts
│
├── infrastructure/
│   └── cache/
│       └── redis.module.ts
│
├── modules/
│   └── auth/
│       ├── controllers/
│       ├── dto/
│       ├── guards/
│       ├── interfaces/
│       ├── repositories/
│       ├── services/
│       └── strategies/
```

---

# Architecture Conventions

## API Versioning

All endpoints must be prefixed with:

```txt
/api/v1/
```

---

# Repository Rules

- Repositories handle all Drizzle database queries
- Services must never directly query the database

---

# Service Rules

Services handle only business logic.

---

# DTO Rules

DTOs must always use:

- `class-validator`
- `@ApiProperty`

---

# Soft Deletes

Soft deletes are implemented using:

```txt
deletedAt
```

timestamps.

---

# Primary Keys

All primary keys use:

```txt
UUID
```

---

# Security Rules

- Never expose `passwordHash`
- JWT secrets must come from environment variables
- Sensitive data must never be committed

---

# Global Modules

`DatabaseModule` and `CacheModule` are global modules.

Feature modules should NOT re-import them.

---

# Swagger Convention Rules

Always use:

- `ApiAuthEndpoint`
- `ApiPublicEndpoint`

Never use raw Swagger decorators directly inside controllers.