# Data Consistency Strategy - Redis vs PostgreSQL

## Problem: Payment Failure After Lock

**Scenario:** User locks seat in Redis (Rust), but payment fails in Go service. Need to reconcile.

---

## Solution: Event-Driven Consistency with Compensating Transactions

### Flow

```
1. RUST: Acquire lock in Redis (TTL: 5 min)
   → Publish Kafka event: `seat.locked`
   
2. GO: Create booking (status: PENDING_PAYMENT)
   → Update Postgres: seats.status = 'LOCKED', bookings.status = 'PENDING_PAYMENT'
   
3. GO: Payment attempt
   ├─ SUCCESS → Update bookings.status = 'PAID', seats.status = 'BOOKED'
   │           → DEL Redis lock (permanent booking)
   │           → Kafka: `payment.success`
   │
   └─ FAILURE → Update bookings.status = 'FAILED'
               → Call RUST API: Release lock (INCR inventory, DEL lock key)
               → Kafka: `payment.failed`
```

### Consistency Guarantees

| Scenario | Redis State | Postgres State | Resolution |
|----------|-------------|----------------|------------|
| **Happy Path** | Lock acquired → Deleted on payment | PENDING → PAID | Lock removed, seat marked BOOKED |
| **Payment Fails** | Lock exists | booking.status = FAILED | Go calls Rust `/release-lock` API. Rust releases Redis lock immediately |
| **User Abandons** | Lock expires (5 min TTL) | booking.status = PENDING_PAYMENT | Background job (every 60s) scans stale bookings, updates to FAILED |
| **System Crash Mid-Payment** | Lock expires naturally | booking.status = PENDING_PAYMENT | TTL auto-releases. Cleanup job marks booking FAILED after 6 min |

---

## Implementation Details

### 1. Compensating Transaction (Payment Failure)

**Go Service (on payment failure):**
```go
// pseudo-code
func HandlePaymentFailure(ctx context.Context, bookingID int64) error {
    // Update Postgres
    db.Exec("UPDATE bookings SET status = 'FAILED' WHERE id = ?", bookingID)
    
    // Call Rust API to release lock
    resp, err := http.Post(
        fmt.Sprintf("%s/api/v1/lock/release", rustServiceURL),
        "application/json",
        bytes.NewBuffer([]byte(fmt.Sprintf(`{"event_id": %d, "seat_id": %d}`, eventID, seatID)))
    )
    
    // Publish Kafka event for audit
    kafkaProducer.Send("payment.failed", paymentEvent)
    
    return err
}
```

### 2. Background Reconciliation Job

**Go Service (runs every 60 seconds):**
```go
func ReconcileStaleBookings(ctx context.Context) {
    // Find bookings older than 6 minutes still pending
    staleBookings := db.Query(`
        SELECT id, event_id, seat_id 
        FROM bookings 
        WHERE status = 'PENDING_PAYMENT' 
        AND created_at < NOW() - INTERVAL '6 minutes'
    `)
    
    for _, booking := range staleBookings {
        // Mark as FAILED
        db.Exec("UPDATE bookings SET status = 'FAILED' WHERE id = ?", booking.ID)
        
        // Ensure Redis lock is released (idempotent)
        callRustReleaseLock(booking.EventID, booking.SeatID)
        
        // Log to Kafka
        kafkaProducer.Send("booking.timeout", booking)
    }
}
```

### 3. Idempotent Lock Release (Rust)

**Rust Service (Axum):**
```rust
// pseudo-code
async fn release_lock(event_id: i64, seat_id: i64) -> Result<()> {
    let lock_key = format!("lock:event:{}:seat:{}", event_id, seat_id);
    
    // Lua script for atomic release (shown in redis-design.md)
    let result: i32 = redis_conn.eval(RELEASE_SCRIPT, &[
        lock_key,
        format!("inventory:event:{}", event_id),
        format!("available:event:{}", event_id),
        seat_id.to_string(),
        price.to_string()
    ]).await?;
    
    // Publish Kafka event
    kafka_producer.send("lock.released", event).await?;
    
    Ok(())
}
```

---

## Edge Cases

### Redis Flush/Crash
- **Detection**: Health check endpoint in Rust monitors Redis connection
- **Action**: 
  - Mark all Postgres bookings as FAILED if Redis is down > 1 min
  - Rebuild Redis state from Postgres on Redis restart:
    - Load `seats` with status != 'BOOKED'
    - Initialize inventory counters

### Duplicate Lock Release
- **Prevention**: Lua script checks key existence before releasing
- **Idempotency**: Multiple release calls safe (returns 0 if already released)

### Network Partition (Go ↔ Rust)
- **Detection**: Circuit breaker pattern with 3 retry attempts
- **Fallback**: 
  - Go service logs failure to Kafka
  - Alert operations team
  - Rely on TTL auto-expiry
  - Background job handles cleanup

---

## Monitoring

### Key Metrics
1. **Lock-to-Booking Lag**: Time between Redis lock and Postgres booking creation
2. **Stale Booking Rate**: % of bookings that timeout (> 6 min)
3. **Failed Payment Rate**: % of PENDING → FAILED transitions
4. **Reconciliation Actions**: Count of bookings cleaned up by background job

### Alerts
- Lock-to-Booking lag > 500ms
- Stale booking rate > 5%
- Reconciliation job failed to run for 2+ cycles
- Redis-Postgres inventory mismatch > 10 seats per event

