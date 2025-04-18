# Implement In-Memory Caching with TTL for Scraped Content

- Status: accepted
- Deciders: Development Team
- Date: 2023-04-06

## Context and Problem Statement

Web scraping operations are resource-intensive and can put load on target servers. Repeatedly scraping the same content within short time periods is inefficient and potentially harmful to target sites. How can we reduce unnecessary scraping while still ensuring data freshness?

## Decision Drivers

- Reduce load on target websites by avoiding unnecessary repeat requests
- Improve response times for frequently requested URLs
- Ensure data freshness by providing mechanisms to invalidate stale data
- Maintain memory usage within reasonable limits
- Support both CLI and API interfaces with the same caching system

## Considered Options

- No caching - scrape on every request
- File-based caching
- Database caching (using existing Prisma setup)
- In-memory caching with time-to-live (TTL)
- Distributed caching (Redis)

## Decision Outcome

Chosen option: "In-memory caching with TTL" because it provides the best balance of simplicity, performance, and freshness control without adding external dependencies. This approach works well for both the API and CLI interfaces.

### Positive Consequences

- Significantly reduced response times for cached URLs
- Decreased load on target websites due to fewer repeat requests
- Built-in cache expiration ensures data freshness
- Simple implementation with minimal dependencies
- Configurable TTL allows fine-tuning based on content type

### Negative Consequences

- In-memory caches don't persist across application restarts
- Cache size limited by available memory
- No sharing of cache between multiple instances of the application
- May require manual cache invalidation for time-sensitive use cases

## Pros and Cons of the Options

### No Caching

- Good, because it's simple to implement
- Good, because it always provides fresh data
- Bad, because it leads to redundant scraping operations
- Bad, because it increases load on target servers
- Bad, because it results in slower response times

### File-Based Caching

- Good, because it persists across application restarts
- Good, because it's simple to implement
- Bad, because file I/O can be slow for high-frequency operations
- Bad, because manual cleanup of stale files is required

### Database Caching

- Good, because it leverages existing infrastructure
- Good, because it persists across restarts
- Bad, because it adds database load for what should be quick operations
- Bad, because it requires additional database maintenance

### In-Memory Caching with TTL

- Good, because it provides the fastest possible response times
- Good, because TTL ensures data freshness
- Good, because it's simple to implement with node-cache
- Good, because memory usage is automatically managed
- Bad, because it doesn't persist across application restarts
- Bad, because it's limited by available memory

### Distributed Caching (Redis)

- Good, because it enables sharing cache across multiple instances
- Good, because it provides persistence
- Good, because it scales well
- Bad, because it adds an external dependency
- Bad, because it increases operational complexity

## Implementation Details

We implemented caching using the `node-cache` package with the following key design decisions:

1. Default TTL of 1 hour for most content
2. Option to override TTL on a per-request basis
3. Option to bypass cache for specific requests
4. Automatic key generation based on URL MD5 hash
5. Cache statistics for monitoring cache effectiveness

## Follow-Up Actions

- Implement cache monitoring to track hit/miss rates
- Add API endpoint for manual cache invalidation
- Consider implementing a distributed cache as a future enhancement if needed
