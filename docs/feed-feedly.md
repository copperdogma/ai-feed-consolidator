# Feedly Integration Documentation

20240424: Created by Cam Marsollier with Claude 3.5 Sonnet

## Current Implementation

### Authentication
- Using OAuth 2.0 for authentication
- Token refresh mechanism implemented with proper error handling
- Rate limiting support with retry-after header handling

### Content Retrieval
- Currently fetching saved items ("Read Later") only
- Implemented robust retry logic with exponential backoff
- Comprehensive error handling for API failures

## API Capabilities Research

### Reading Content
- `/v3/streams/contents` - Get content from streams
  - Supports multiple stream IDs
  - Pagination with continuation tokens
  - Filtering by engagement (read/unread)
  - Sorting options (newest, oldest, engagement)

### Marking Items
- `/v3/markers` - Update item statuses
  - Mark items as read/unread
  - Mark items as saved/unsaved
  - Supports bulk operations (up to 1000 items)
  - Provides asynchronous operation for large sets

### Stream Types
1. User Streams
   - `user/{userId}/category/{globalId}` - User categories
   - `user/{userId}/tag/{globalId}` - User tags
   - `user/{userId}/saved` - Saved for later items

2. Feed Streams
   - `feed/{feedId}` - Specific feed content
   - `feed/{feedId}/latest` - Latest entries

3. Category/Tag Streams
   - Support for organizational hierarchies
   - Custom categorization

### Status Management
- Bidirectional sync supported:
  - Can mark items as read/unread
  - Can save/unsave items
  - Supports bulk operations
  - Provides timestamp-based sync

### API Limitations
1. Rate Limits
   - 250 requests per hour for free accounts
   - Higher limits for Pro accounts
   - Retry-After header provided

2. Pagination
   - Maximum 1000 items per request
   - Continuation token required for pagination

3. Content Retention
   - Items available for 31 days
   - Saved items retained indefinitely

## Implementation Requirements for Vertical Slice

### Required Endpoints

1. Content Retrieval
```typescript
// Get unread items
GET /v3/streams/contents?streamId=user/{userId}/category/global.all&unreadOnly=true

// Get saved items
GET /v3/streams/contents?streamId=user/{userId}/saved
```

2. Status Updates
```typescript
// Mark as read
POST /v3/markers
{
  "action": "markAsRead",
  "type": "entries",
  "entryIds": ["entryId1", "entryId2"]
}

// Save/unsave items
POST /v3/markers
{
  "action": "markAsSaved"/"markAsUnsaved",
  "type": "entries",
  "entryIds": ["entryId1", "entryId2"]
}
```

### Implementation Tasks

1. Content Sync
- [ ] Implement unread items stream
- [ ] Add saved items stream
- [ ] Create unified stream view
- [ ] Implement proper pagination

2. Status Management
- [ ] Add mark as read/unread functionality
- [ ] Implement save/unsave actions
- [ ] Add bulk update support
- [ ] Implement proper error handling

3. Sync Infrastructure
- [ ] Add background sync mechanism
- [ ] Implement proper caching
- [ ] Add offline support
- [ ] Handle sync conflicts

## API Response Structure

```typescript
interface FeedlyEntry {
  id: string;
  title: string;
  content?: {
    content: string;
    direction?: string;
  };
  summary?: {
    content: string;
    direction?: string;
  };
  author?: string;
  published: number;
  updated?: number;
  origin: {
    streamId: string;
    title: string;
    htmlUrl?: string;
  };
  visual?: {
    url: string;
    width: number;
    height: number;
  };
  unread?: boolean;
  categories?: Array<{
    id: string;
    label: string;
  }>;
  tags?: Array<{
    id: string;
    label: string;
  }>;
  engagement?: number;
  engagementRate?: number;
}
```

## Conclusion

The Feedly API provides all necessary capabilities for our vertical slice:
1. ✅ Unread/read status management
2. ✅ Save for later functionality
3. ✅ Bulk operations support
4. ✅ Proper sync mechanisms

The main considerations are:
1. Rate limiting - Need proper handling and optimization
2. Pagination - Must handle continuation tokens
3. Offline support - Need local caching
4. Error handling - Must handle various API failure modes 