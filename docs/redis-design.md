# Redis Key Design - TicketRush

## Key Naming Convention & Value Structure

| Purpose | Key Pattern | Value Type | Value Structure | TTL | Notes |
|---------|-------------|------------|-----------------|-----|-------|
| **Seat Lock** | `lock:event:{event_id}:seat:{seat_id}` | String | `{"user_id": 12345, "locked_at": 1706620800, "booking_ref": "BK-ABC123"}` (JSON) | 300s (5 min) | Atomic lock per seat. Used with SETNX for race condition handling |
| **User Lock List** | `user:locks:{user_id}` | Set | Set of seat_ids | 300s (5 min) | Track all seats locked by a user for batch cleanup |
| **Event Inventory** | `inventory:event:{event_id}` | String (Integer) | `"1500"` (available count) | No TTL | Decremented atomically with DECR. Synced from Postgres on event creation |
| **Event Seats Available** | `available:event:{event_id}` | Sorted Set | `{seat_id: base_price}` | No TTL | Quick lookup of available seats sorted by price. Remove on lock, re-add on expiry |
| **Lock Expiry Queue** | `expiry:{epoch_timestamp}` | Set | Set of `"event:{event_id}:seat:{seat_id}"` keys | 360s (TTL + buffer) | Secondary cleanup mechanism. Processed by background job |

## TTL Strategy

### Lock Expiration Flow
1. **Lock Creation**: `SETEX lock:event:123:seat:456 300 {user_id:789}` (5-minute TTL)
2. **Payment Window**: User has 5 minutes to complete payment
3. **Auto-Release**: Redis expires key automatically after 300s
4. **Cleanup Job** (Rust service): Every 60s scan expired locks, re-add seats to `available` sorted set, increment inventory counter

### TTL Values
- **Seat Lock**: 300s (5 minutes) - Balance between user UX and seat availability
- **User Lock List**: 300s (same as seat lock) - Auto-cleanup of user session data
- **Lock Expiry Queue**: 360s (6 minutes) - Buffer for async processing

## Atomic Operations

### Lock Acquisition (Lua Script)
```lua
-- lock_seat.lua
local lock_key = KEYS[1]  -- lock:event:{id}:seat:{id}
local inventory_key = KEYS[2]  -- inventory:event:{id}
local available_key = KEYS[3]  -- available:event:{id}
local user_locks_key = KEYS[4]  -- user:locks:{user_id}
local seat_id = ARGV[1]
local user_data = ARGV[2]  -- JSON string
local ttl = ARGV[3]

-- Check if already locked
if redis.call('EXISTS', lock_key) == 1 then
    return 0  -- Already locked
end

-- Check inventory
local count = tonumber(redis.call('GET', inventory_key))
if count <= 0 then
    return -1  -- Sold out
end

-- Atomic lock
redis.call('SETEX', lock_key, ttl, user_data)
redis.call('DECR', inventory_key)
redis.call('ZREM', available_key, seat_id)
redis.call('SADD', user_locks_key, seat_id)
redis.call('EXPIRE', user_locks_key, ttl)

return 1  -- Success
```

### Lock Release (Lua Script)
```lua
-- release_seat.lua
local lock_key = KEYS[1]
local inventory_key = KEYS[2]
local available_key = KEYS[3]
local user_locks_key = KEYS[4]
local seat_id = ARGV[1]
local price = ARGV[2]

if redis.call('DEL', lock_key) == 1 then
    redis.call('INCR', inventory_key)
    redis.call('ZADD', available_key, price, seat_id)
    redis.call('SREM', user_locks_key, seat_id)
    return 1
end

return 0
```

## Data Sync

- **Initial Load**: Postgres `seats` table → Redis on event creation
- **Lock → Booking**: Rust passes lock token to Go service for validation before persisting
- **Cleanup**: Background job reconciles Redis vs Postgres every 10 minutes

