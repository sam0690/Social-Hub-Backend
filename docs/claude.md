# Social Hub Backend Architecture & Current Implementation

## Project Overview

I am building a **NestJS + TypeScript + Drizzle ORM** social media backend called **Social Hub**.

---

# Infrastructure

- NestJS project with TypeScript
- `moduleResolution: nodenext`
- All imports use `.ts` extensions
- PostgreSQL running on port `5433` via Docker
- Redis running on port `6380` via Docker
- Drizzle ORM configured with global `DRIZZLE` token via `DatabaseModule` using `@Global()`
- Redis configured via `CacheModule` using `@nestjs-modules/ioredis`
- Redis injected using `@InjectRedis()`
- Global config loaded:
  - `appConfig`
  - `databaseConfig`
  - `redisConfig`
  - `authConfig`
- Custom environment validation in:
  - `src/config/env.ts`
- Environment helpers:
  - `getRequiredEnv`
  - `getOptionalEnv`

---

# Swagger Configuration

Configured in `main.ts` with:

- `addBearerAuth`
- Bearer name: `access-token`
- `persistAuthorization: true`

Global Swagger decorators in:

```txt
src/common/decorators/swagger.decorators.ts
```

## Available Decorators

### `ApiAuthEndpoint(summary, responses?)`

- Protected routes
- Includes `@ApiBearerAuth`

### `ApiPublicEndpoint(summary, responses?)`

- Public routes

---

# Swagger Conventions

- Always use `@ApiTags('ModuleName')` on controller classes
- Always use `@ApiProperty({ example: '...' })` on DTO fields
- Never use raw:
  - `@ApiOperation`
  - `@ApiBearerAuth`
  - `@ApiResponse`

inside controllers

---

# Database Schema (Drizzle ORM)

```txt
src/database/schema/
├── auth/
│   ├── users.ts
│   ├── sessions.ts
│   ├── email-verifications.ts
│   └── password-resets.ts
│
├── social/
│   ├── follows.ts
│   ├── blocked-users.ts
│   ├── muted-users.ts
│   └── feed-items.ts
│
├── posts/
│   ├── posts.ts
│   ├── comments.ts
│   ├── likes.ts
│   ├── bookmarks.ts
│   ├── hashtags.ts
│   └── mentions.ts
│
├── messaging/
├── notifications/
├── media/
├── moderation/
│
├── relations.ts
└── index.ts
```

---

# Auth Schema

## `users.ts`

Fields:

- `id`
- `username`
- `email`
- `passwordHash`
- `displayName`
- `bio`
- `avatarUrl`
- `bannerUrl`
- `isVerified`
- `isPrivate`
- `role`
  - `USER`
  - `MODERATOR`
  - `ADMIN`
- `status`
  - `ACTIVE`
  - `BANNED`
  - `SUSPENDED`
- `lastSeenAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

---

## `sessions.ts`

Fields:

- `id`
- `userId`
- `refreshTokenHash`
- `ipAddress`
- `userAgent`
- `expiresAt`
- `revokedAt`
- `createdAt`

---

## `email-verifications.ts`

Fields:

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `usedAt`
- `createdAt`

---

## `password-resets.ts`

Fields:

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `usedAt`
- `createdAt`

---

# Social Schema

## `follows.ts`

- `followerId`
- `followingId`
- `createdAt`

## `blocked-users.ts`

- `blockerId`
- `blockedId`
- `createdAt`

## `muted-users.ts`

- `muterId`
- `mutedId`
- `createdAt`

## `feed-items.ts`

- `id`
- `userId`
- `postId`
- `postAuthorId`
- `createdAt`

Indexes:

- `userId`
- `createdAt`

---

# Posts Schema

## `posts.ts`

Fields:

- `id`
- `authorId`
- `content`
- `visibility`
  - `PUBLIC`
  - `FOLLOWERS`
  - `PRIVATE`
- `likeCount`
- `commentCount`
- `shareCount`
- `mediaCount`
- `createdAt`
- `updatedAt`
- `deletedAt`

---

## `comments.ts`

Fields:

- `id`
- `postId`
- `authorId`
- `parentCommentId`
- `content`
- `likeCount`
- `replyCount`
- `createdAt`
- `updatedAt`
- `deletedAt`

---

## `likes.ts`

Fields:

- `id`
- `userId`
- `postId`
- `commentId`
- `targetType`
  - `POST`
  - `COMMENT`
- `createdAt`

---

## `bookmarks.ts`

Fields:

- `id`
- `userId`
- `postId`
- `createdAt`

---

## `hashtags.ts`

Fields:

- `id`
- `name`
- `postCount`
- `createdAt`

Also includes:

- `postHashtags` join table

---

## `mentions.ts`

Fields:

- `id`
- `postId`
- `mentionedUserId`
- `createdAt`

---

# Reserved Future Modules

## Phase 3

- `messaging/`
- `notifications/`

## Phase 4

- `media/`

## Phase 5

- `moderation/`

---

# Relations

All Drizzle relations are defined in:

```txt
src/database/schema/relations.ts
```

Exports located in:

```txt
src/database/schema/index.ts
```

---

# Auth Module

Location:

```txt
src/modules/auth/
```

## Endpoints

### Register

```http
POST /api/v1/auth/register
```

- Argon2 password hashing
- Returns:
  - user
  - accessToken
  - refreshToken

---

### Login

```http
POST /api/v1/auth/login
```

- Validates credentials
- Returns tokens

---

### Refresh Token

```http
POST /api/v1/auth/refresh
```

- Rotates refresh token
- Uses `JwtRefreshGuard`

---

### Logout

```http
POST /api/v1/auth/logout
```

- Revokes all sessions
- Uses `JwtAuthGuard`

---

### Forgot Password

```http
POST /api/v1/auth/forgot-password
```

- Creates hashed reset token
- 15 minute expiry

---

### Reset Password

```http
POST /api/v1/auth/reset-password
```

- Validates token
- Hashes new password
- Revokes sessions

---

### Current User

```http
GET /api/v1/auth/me
```

- Returns authenticated user
- Never exposes `passwordHash`

---

## Guards

Located in:

```txt
src/modules/auth/guards/
```

- `JwtAuthGuard`
- `JwtRefreshGuard`

---

## Strategies

Located in:

```txt
src/modules/auth/strategies/
```

- `jwt.strategy.ts`
- `jwt-refresh.strategy.ts`

---

# Users Module

Location:

```txt
src/modules/users/
```

## Endpoints

### Profile

```http
GET /api/v1/users/me
```

Returns:

- own profile
- followerCount
- followingCount

---

### Blocked Users

```http
GET /api/v1/users/me/blocked
```

---

### Muted Users

```http
GET /api/v1/users/me/muted
```

---

### Search Users

```http
GET /api/v1/users/search?q=
```

- Excludes blocked users

---

### Public Profile

```http
GET /api/v1/users/:username
```

Returns:

- `isFollowing`
- `followerCount`
- `followingCount`

---

### Update Profile

```http
PATCH /api/v1/users/me
```

Updates:

- `displayName`
- `bio`
- `isPrivate`

---

### Delete Account

```http
DELETE /api/v1/users/me
```

- Soft delete

---

### Follow User

```http
POST /api/v1/users/:username/follow
```

- Includes block checks

---

### Unfollow User

```http
DELETE /api/v1/users/:username/follow
```

---

### Followers

```http
GET /api/v1/users/:username/followers
```

- Cursor pagination

---

### Following

```http
GET /api/v1/users/:username/following
```

- Cursor pagination

---

### Block User

```http
POST /api/v1/users/:username/block
```

- Auto unfollows both ways

---

### Unblock User

```http
DELETE /api/v1/users/:username/block
```

---

### Mute User

```http
POST /api/v1/users/:username/mute
```

---

### Unmute User

```http
DELETE /api/v1/users/:username/mute
```

---

# Posts Module

Location:

```txt
src/modules/posts/
```

## Endpoints

### Create Post

```http
POST /api/v1/posts
```

Features:

- Extract hashtags
- Extract mentions
- Trigger hybrid feed fan-out

---

### Get Post

```http
GET /api/v1/posts/:postId
```

Returns:

- `isLiked`
- `isBookmarked`

---

### User Posts

```http
GET /api/v1/users/:username/posts
```

- Cursor pagination

---

### Update Post

```http
PATCH /api/v1/posts/:postId
```

---

### Delete Post

```http
DELETE /api/v1/posts/:postId
```

- Soft delete
- Removes feed items

---

### Like Post

```http
POST /api/v1/posts/:postId/like
```

- Increments `likeCount`

---

### Unlike Post

```http
DELETE /api/v1/posts/:postId/like
```

- Decrements `likeCount`

---

### Post Likes

```http
GET /api/v1/posts/:postId/likes
```

- Cursor pagination

---

### Create Comment

```http
POST /api/v1/posts/:postId/comments
```

Supports:

- comments
- replies

Optional:

- `parentCommentId`

---

### Get Comments

```http
GET /api/v1/posts/:postId/comments
```

- Paginated top-level comments

---

### Comment Replies

```http
GET /api/v1/comments/:commentId/replies
```

- Cursor pagination

---

### Delete Comment

```http
DELETE /api/v1/comments/:commentId
```

- Soft delete

---

### Like Comment

```http
POST /api/v1/comments/:commentId/like
```

---

### Unlike Comment

```http
DELETE /api/v1/comments/:commentId/like
```

---

### Bookmark Post

```http
POST /api/v1/posts/:postId/bookmark
```

---

### Remove Bookmark

```http
DELETE /api/v1/posts/:postId/bookmark
```

---

### User Bookmarks

```http
GET /api/v1/me/bookmarks
```

- Cursor pagination

---

### Hashtag Posts

```http
GET /api/v1/hashtags/:hashtagName/posts
```

---

# Feed Module

Location:

```txt
src/modules/feed/
```

## Endpoints

### Home Feed

```http
GET /api/v1/feed
```

Features:

- Hybrid feed
- Fan-out on write
- Read-time merge for celebrities
- Redis cache: 60s
- Fallback to trending

Celebrity threshold:

```txt
1000 followers
```

---

### Trending Feed

```http
GET /api/v1/feed/trending
```

Trending score formula:

```txt
(likeCount × 3) + (commentCount × 2) + shareCount
```

Redis cache:

```txt
300 seconds
```

---

## Feed Features

- Celebrity threshold: `1000`
- Fan-out triggered on post creation
- Fan-out removed on post deletion
- Feed cache invalidated on followed user post creation
- Fully tested

---

## FeedService Exports

- `fanOutPost`
- `removeFanOutPost`
- `invalidateUserFeed`

---

# Module Folder Structure

```txt
src/modules/{module}/
├── controllers/
├── services/
├── repositories/
├── dto/
├── guards/
├── strategies/
├── interfaces/
└── {module}.module.ts
```

---

# Architecture Conventions

## Imports

- Always use `.ts` extensions

---

## API Prefix

- All endpoints prefixed with:

```txt
/api/v1/
```

---

## Repository Pattern

- Repositories handle all Drizzle DB queries
- Services handle business logic only
- Never query DB directly inside services

---

## DTO Rules

- Use `class-validator`
- Use `@ApiProperty`

---

## Soft Deletes

- Use `deletedAt` timestamp

---

## IDs

- UUID primary keys only

---

## Security

- Never expose `passwordHash`

---

## Global Modules

Never re-import:

- `DatabaseModule`
- `CacheModule`

because they are already `@Global()`

---

## Pagination

- Always use cursor-based pagination
- Never use OFFSET pagination

---

## Counter Updates

Use:

```ts
sql``
```

from `drizzle-orm`

for atomic increment/decrement queries.

---

## Idempotent Inserts

Always use:

```ts
onConflictDoNothing()
```