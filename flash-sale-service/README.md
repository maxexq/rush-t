# Flash Sale Service - TicketRush

High-performance Rust service for handling flash sale ticket bookings.

## Architecture

**Hot Path Service** - Designed for extreme low latency:
- ✅ No database queries in critical path
- ✅ Atomic Redis locking (SET NX) for race condition handling
- ✅ Async Kafka event publishing
- ✅ Connection pooling (Redis)
- ✅ Optimized Kafka producer settings

## Tech Stack

- **Framework:** Axum 0.7 (Tokio runtime)
- **Redis:** deadpool-redis (connection pool)
- **Kafka:** rdkafka (high-performance producer)
- **Serialization:** serde/serde_json

## API Endpoints

### POST `/api/v1/book`
Book a seat during flash sale.

**Request:**
```json
{
  "event_id": "event123",
  "seat_id": "A1",
  "user_id": "user456"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Seat reserved successfully",
  "booking_id": "uuid-here"
}
```

**Response (409 Conflict):**
```json
{
  "error": "Seat already reserved"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "redis": true,
  "kafka": true
}
```

## How Atomic Locking Works

```rust
// Redis command: SET ticket_lock:{event_id}:{seat_id} {user_id} NX PX 300000
// NX = Set if Not Exists (atomic check-and-set)
// PX = Expiration in milliseconds

let lock_acquired = redis::cmd("SET")
    .arg(&lock_key)
    .arg(&request.user_id)
    .arg("NX")
    .arg("PX")
    .arg(state.config.lock_ttl_ms)
    .query_async(&mut *conn)
    .await
    .unwrap_or(false);
```

**Race Condition Scenario:**
- 100 users try to book "Seat A1" simultaneously
- Redis SET NX ensures only ONE user gets `true` (lock acquired)
- Other 99 users get `false` → immediate 409 Conflict response
- No database deadlocks, no read-modify-write race conditions

## Setup

1. **Install Rust** (1.75+):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Create `.env` file:**
```bash
cp .env.example .env
```

3. **Start dependencies** (Redis + Kafka):
```bash
docker-compose up -d redis kafka
```

4. **Run service:**
```bash
cargo run --release
```

## Development

**Build:**
```bash
cargo build --release
```

**Run (debug):**
```bash
RUST_LOG=debug cargo run
```

**Format:**
```bash
cargo fmt
```

**Lint:**
```bash
cargo clippy
```

## Production Optimizations

The `Cargo.toml` includes release optimizations:
- LTO (Link-Time Optimization) enabled
- Single codegen unit for maximum optimization
- Optimized Kafka producer settings (batching, compression)

## Load Testing

Example with `wrk`:
```bash
wrk -t12 -c400 -d30s --latency \
  -s booking.lua http://localhost:8080/api/v1/book
```

**Expected latency:** < 5ms p99 (with local Redis/Kafka)

## Integration with TicketRush

1. Service acquires Redis lock atomically
2. Publishes event to Kafka topic: `booking.events`
3. Core Service (Go) consumes event and persists to PostgreSQL
4. Payment Service processes payment
5. Lock expires after 5 minutes if payment not completed

