# PostgreSQL Overview

## Development Environment

The project uses PostgreSQL 16 running in a Docker container for development and testing.

### Container Setup

The database runs on port 5433 to avoid conflicts with any local PostgreSQL installation:

```bash
# Start the database container
docker run -d \
  --name ai-feed-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  -v ai-feed-postgres-data:/var/lib/postgresql/data \
  postgres:16

# Stop the container
docker stop ai-feed-postgres

# Remove the container (data persists in volume)
docker rm ai-feed-postgres

# Remove the data volume (CAUTION: destroys all data)
docker volume rm ai-feed-postgres-data
```

### Connection Details

- Host: `localhost`
- Port: `5433`
- User: `postgres`
- Password: `postgres`
- Databases:
  - Development: `ai-feed-dev`
  - Test: `ai-feed-test`

Connection URLs:
```
Development: postgres://postgres:postgres@localhost:5433/ai-feed-dev
Test: postgres://postgres:postgres@localhost:5433/ai-feed-test
```

## Database Management

The project includes a unified database management script (`scripts/db.cjs`) that handles:

1. Database creation and deletion
2. Schema migrations
3. Health checks
4. Backups and restoration

### Common Commands

```bash
# Development database
npm run migrate           # Run pending migrations
npm run migrate:status    # Show migration status
npm run migrate:verify    # Verify database structure
npm run migrate:reset     # Reset database (drop all tables)

# Test database
npm run test:db:setup    # Reset and migrate test database

# Options
--dry-run               # Show what would be done
--verbose              # Show debug information
--force               # Allow dangerous operations
--no-backup           # Skip backup
--parallel            # Enable parallel operations
```

## Maintenance

### Regular Tasks

1. **Vacuum**: Clean up dead tuples and update statistics
   ```sql
   VACUUM ANALYZE;
   ```

2. **Reindex**: Rebuild indexes for optimal performance
   ```sql
   REINDEX DATABASE "ai-feed-dev";
   ```

3. **Update Statistics**: Ensure query planner has current data
   ```sql
   ANALYZE;
   ```

### Monitoring Queries

1. **Active Queries**
   ```sql
   SELECT pid, age(clock_timestamp(), query_start), usename, query 
   FROM pg_stat_activity 
   WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' 
   ORDER BY query_start desc;
   ```

2. **Table Sizes**
   ```sql
   SELECT 
     relname as "Table",
     pg_size_pretty(pg_total_relation_size(relid)) As "Size",
     pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as "External Size"
   FROM pg_catalog.pg_statio_user_tables 
   ORDER BY pg_total_relation_size(relid) DESC;
   ```

3. **Index Usage**
   ```sql
   SELECT 
     schemaname, tablename, indexname, 
     idx_scan as number_of_scans,
     idx_tup_read as tuples_read,
     idx_tup_fetch as tuples_fetched
   FROM pg_stat_user_indexes 
   ORDER BY number_of_scans DESC;
   ```

### Performance Tuning

Key configuration parameters in `postgresql.conf`:

```ini
# Memory Configuration
shared_buffers = 128MB          # 25% of available RAM
work_mem = 4MB                  # For complex sorts
maintenance_work_mem = 64MB     # For VACUUM, CREATE INDEX, etc.

# Query Planning
random_page_cost = 1.1          # SSD storage
effective_cache_size = 4GB      # 50% of available RAM

# Write Ahead Log
wal_level = replica            # Minimum for replication
max_wal_size = 1GB            # Maximum WAL size
min_wal_size = 80MB           # Minimum WAL size

# Query Execution
max_parallel_workers_per_gather = 2  # Parallel query workers
max_parallel_workers = 4             # Total parallel workers
```

## Backup and Recovery

### Logical Backups

```bash
# Create backup
pg_dump -h localhost -p 5433 -U postgres -d ai-feed-dev -F c -f backup.dump

# Restore backup
pg_restore -h localhost -p 5433 -U postgres -d ai-feed-dev -c backup.dump
```

### Point-in-Time Recovery

1. Enable WAL archiving in `postgresql.conf`:
   ```ini
   wal_level = replica
   archive_mode = on
   archive_command = 'cp %p /path/to/archive/%f'
   ```

2. Create base backup:
   ```bash
   pg_basebackup -h localhost -p 5433 -U postgres -D backup
   ```

3. Recover to specific time:
   ```bash
   # In recovery.conf
   restore_command = 'cp /path/to/archive/%f %p'
   recovery_target_time = '2025-02-21 20:00:00'
   ```

## Security

### Connection Security

1. Use connection pooling (implemented in `DatabaseManager`)
2. Set appropriate `statement_timeout`
3. Use SSL for connections where available

### Access Control

1. Development uses simple password authentication
2. Production should use:
   - SSL connections
   - Strong passwords
   - Limited network access
   - Role-based access control

### SQL Injection Prevention

1. Use parameterized queries (implemented in `DatabaseManager`)
2. Escape user input
3. Use prepared statements where possible

## Error Handling

Common error categories and handling strategies:

1. **Connection Errors**
   - Implement exponential backoff
   - Maximum retry attempts
   - Connection pooling with proper cleanup

2. **Query Errors**
   - Transaction rollback
   - Error logging with context
   - Proper error categorization

3. **Constraint Violations**
   - Validate data before insertion
   - Handle unique constraint violations
   - Proper error messages for foreign key violations

## Development Workflow

1. **Schema Changes**
   ```bash
   # Create new migration
   npm run migrate:create add_new_feature
   
   # Apply migration
   npm run migrate
   
   # Verify changes
   npm run migrate:verify
   ```

2. **Testing**
   ```bash
   # Reset test database
   npm run test:db:setup
   
   # Run tests
   npm test
   ```

3. **Debugging**
   ```bash
   # Show migration status
   npm run migrate:status
   
   # Verify database structure
   npm run migrate:verify
   
   # Check logs
   docker logs ai-feed-postgres
   ```

## Best Practices

1. **Database Design**
   - Use appropriate data types
   - Implement proper constraints
   - Create necessary indexes
   - Document schema changes

2. **Query Optimization**
   - Use EXPLAIN ANALYZE
   - Monitor slow queries
   - Regular VACUUM and ANALYZE
   - Keep statistics up to date

3. **Development**
   - Use transactions appropriately
   - Handle errors properly
   - Clean up resources
   - Follow naming conventions

4. **Maintenance**
   - Regular backups
   - Monitor disk space
   - Update statistics
   - Check for bloat

## Query Result Handling

### Column Name Variations

PostgreSQL may return column names in different formats depending on the query structure:

```sql
-- This might return a column named 'count'
SELECT COUNT(*) FROM table_name;

-- This might return a column named 'count(*)'
SELECT COUNT(*) FROM table_name;
```

When processing query results, always use a robust approach that can handle different column name formats:

```typescript
// Robust approach to extract count value regardless of column name
function extractCount(result: QueryResult): number {
  if (!result || !result.rows || result.rows.length === 0) {
    return 0;
  }
  
  const firstRow = result.rows[0];
  // Get the first property value, regardless of its name
  const firstProperty = Object.values(firstRow)[0];
  
  return parseInt(firstProperty as string, 10) || 0;
}
```

### Null/Undefined Handling

Always check for null or undefined values when processing database query results:

```typescript
// Safe approach with null checks
if (result && result.rows && result.rows.length > 0) {
  // Process result
} else {
  // Handle empty result
}
```

### Debug Logging

Include debug logging when processing database results to help diagnose issues:

```typescript
logger.debug('Query result:', { result });
```

### Error Handling

Implement proper error handling for database queries:

```typescript
try {
  const result = await pool.query('SELECT COUNT(*) FROM table_name');
  // Process result
} catch (error) {
  logger.error('Error executing query', { error, query: 'SELECT COUNT(*) FROM table_name' });
  // Handle error appropriately
}
``` 