# API Reference Documentation

*20240702: Created by Cam Marsollier with Claude 3.7 Sonnet*

This document provides a comprehensive reference of all API endpoints available in the AI Feed Consolidator project. Use this as a guide when working with the backend API.

## Base URL

All API paths are relative to the base URL:

- Development: `http://localhost:3003/api`
- Production: Server URL configured in environment variables

## Authentication

Most endpoints require authentication using Firebase Authentication. The Firebase ID token should be included in the `Authorization` header as a Bearer token:

```
Authorization: Bearer <firebase-id-token>
```

### Authentication Endpoints

| Method | Path | Description | Auth Required | Request Body | Response |
|--------|------|-------------|---------------|--------------|----------|
| GET | `/auth/me` | Get current user information | Yes | - | `{ user: { id, email, name, picture } }` |
| POST | `/auth/verify` | Verify Firebase ID token | No | - | `{ authenticated: true, user: { ... } }` or `{ authenticated: false, error: { ... } }` |
| POST | `/auth/logout` | Log out the current user | Yes | - | `{ success: true, message: 'Logged out successfully' }` |
| GET | `/auth/protected` | Test protected route | Yes | - | `{ message: 'This is a protected route', user: { ... } }` |

## Feed Management Endpoints

### Feeds

| Method | Path | Description | Auth Required | Request Body | Response |
|--------|------|-------------|---------------|--------------|----------|
| GET | `/feeds/` | Get all feeds for current user | Yes | - | Array of feed objects |
| POST | `/feeds/` | Add a new feed | Yes | `{ url: string }` | Created feed object |
| DELETE | `/feeds/:feedId` | Delete a feed | Yes | - | 204 No Content |
| PATCH | `/feeds/:feedId` | Update a feed | Yes | `{ title?: string, description?: string, isActive?: boolean, fetchIntervalMinutes?: number }` | Updated feed object |
| GET | `/feeds/:feedId/health` | Get feed health information | Yes | - | Feed health object |
| GET | `/feeds/:feedId/items` | Get items for a specific feed | Yes | - | Array of feed items |
| GET | `/feeds/items` | Get all feed items for current user | Yes | - | Array of feed items from all active feeds |
| POST | `/feeds/:feedId/refresh` | Manually refresh a feed | Yes | - | Updated feed object |
| POST | `/feeds/import` | Import feeds from OPML file | Yes | Form data with `file` field containing OPML content | `{ success: true, imported: number, failed: number, feeds: Array }` |

### Feed Items

| Method | Path | Description | Auth Required | Request Body | Response |
|--------|------|-------------|---------------|--------------|----------|
| GET | `/feed-items/` | Get saved feed items | Yes | - | Array of saved feed items |
| POST | `/feed-items/:id/toggle-saved` | Toggle saved status for an item | Yes | `{ saved: boolean }` | `{ success: true }` |

## Health Check

| Method | Path | Description | Auth Required | Request Body | Response |
|--------|------|-------------|---------------|--------------|----------|
| GET | `/health` | Check API health | No | - | `{ status: 'ok', timestamp: string }` |

## Error Responses

All API endpoints follow a consistent error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional information
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required or failed
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `SERVER_ERROR`: Internal server error

## API Request/Response Examples

### Add a new feed

**Request:**
```
POST /api/feeds
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "url": "https://example.com/feed.xml"
}
```

**Response:**
```json
{
  "id": 123,
  "title": "Example Feed",
  "description": "An example RSS feed",
  "feedUrl": "https://example.com/feed.xml",
  "siteUrl": "https://example.com",
  "lastFetchedAt": "2023-07-01T12:34:56Z",
  "isActive": true,
  "fetchIntervalMinutes": 60,
  "createdAt": "2023-07-01T12:00:00Z",
  "updatedAt": "2023-07-01T12:34:56Z"
}
```

### Toggle saved status for a feed item

**Request:**
```
POST /api/feed-items/abc123/toggle-saved
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "saved": true
}
```

**Response:**
```json
{
  "success": true
}
```

## Implementation Details

The API is implemented using Express.js with the following file structure:

- `src/server/app.ts`: Main Express application setup
- `src/server/routes/auth.ts`: Authentication routes
- `src/server/routes/feeds.ts`: Feed management routes
- `src/server/routes/feed-items.ts`: Feed item management routes
- `src/server/auth/middleware.ts`: Authentication middleware
- `src/server/auth/verify.ts`: Token verification functions

Routes are registered in the main `app.ts` file and organized by resource type. 