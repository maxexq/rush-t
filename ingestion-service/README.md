# High-Throughput Ingestion Service

**Rust service designed to handle 100,000+ concurrent connections without crashing.**

## The C100k Problem - Solved

This service implements the **"Shock Absorber" architecture pattern**:
- Accepts massive concurrent load
- Does minimal synchronous work
- Pushes to Kafka asynchronously
- Returns `202 Accepted` immediately
- Prevents cascading failures via load shedding

## Key Features

### 1. Load Shedding (Circuit Breaker)
```rust
// When concurrent requests > 100,000:
// - Immediately return 503 Service Unavailable
// - Prevents OOM and thread pool exhaustion
// - Keeps existing requests healthy
ConcurrencyLimitLayer::new(100_000)
```

### 2. Aggressive Timeouts
```rust
// Kill slow clients after 10s
// WHY: Prevents connection slot exhaustion
TimeoutLayer::new(Duration::from_secs(10))
```

### 3. HTTP/2 Optimizations
```rust
.http2_keep_alive_interval(Some(Duration::from_secs(20)))
.http2_max_concurrent_streams(Some(1000))
.tcp_nodelay(true)  // Disable Nagle's algorithm
```

### 4. Optimized Kafka Producer
- Fire-and-forget semantics with short timeout
- Massive internal queue (500k messages)
- Batching + compression (LZ4)
- 100 in-flight requests per connection

### 5. Release Profile Tuning
```toml
[profile.release]
opt-level = 3
lto = "fat"              # Full link-time optimization
codegen-units = 1        # Single unit = best optimization
panic = "abort"          # No unwinding overhead
overflow-checks = false  # Max speed
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  100,000+ Concurrent Users                          │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Concurrency Limiter  │ ◄── Rejects if > 100k
    │   (Load Shedding)    │     Returns 503
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Timeout Middleware  │ ◄── Kills slow clients (10s)
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Ingest Handler      │ ◄── Lightweight validation
    │  (Shock Absorber)    │     Push to Kafka (async)
    └──────────┬───────────┘     Return 202 immediately
               │
               ▼
    ┌──────────────────────┐
    │   Kafka Queue        │ ◄── Buffered (500k messages)
    └──────────┬───────────┘     Batched, compressed
               │
               ▼
    ┌──────────────────────┐
    │  Backend Processors  │ ◄── Async workers consume
    │  (Go/Python/etc)     │     and process at own pace
    └──────────────────────┘
```

## API

### POST `/api/v1/ingest`
Accept event for async processing.

**Request:**
```json
{
  "event_type": "check_in",
  "user_id": "user123",
  "payload": {
    "location": "venue_A",
    "timestamp": "2026-01-30T10:00:00Z"
  }
}
```

**Response (202 Accepted):**
```json
{
  "accepted": true,
  "message": "Event accepted for processing"
}
```

**Response (503 Service Unavailable) - Load Shedding:**
```json
{
  "error": "Server at capacity, try again later"
}
```

### GET `/health`
Health check.

## Setup

1. **Install Rust (1.75+):**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Create `.env`:**
```bash
cp .env.example .env
```

3. **Start Kafka:**
```bash
docker-compose up -d kafka
```

4. **Run service:**
```bash
cargo run --release
```

## Performance Tuning

### OS-Level (Linux)
```bash
# Increase file descriptor limits
ulimit -n 1000000

# Tune TCP settings
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

### Tokio Runtime
```rust
#[tokio::main(flavor = "multi_thread", worker_threads = 16)]
```
- 16 worker threads for CPU-bound work
- Adjust based on CPU cores (typically 2x cores)

### Kafka Producer Settings
```rust
.set("queue.buffering.max.messages", "500000")  // Large buffer
.set("batch.num.messages", "10000")             // Batch size
.set("linger.ms", "5")                          // Batch delay
.set("max.in.flight.requests.per.connection", "100")  // Parallelism
```

## Load Testing

### With `wrk`
```bash
wrk -t12 -c100000 -d60s --latency \
  -s test-load.lua http://localhost:8080/api/v1/ingest
```

### Expected Performance
- **Throughput:** 500,000+ RPS (on high-end hardware)
- **Latency (p50):** < 2ms
- **Latency (p99):** < 50ms
- **Memory:** Stable under load (no leaks)
- **Behavior at capacity:** Graceful degradation (503 errors)

## Monitoring

Key metrics to watch:
1. **Active connections** - Should not exceed MAX_CONCURRENT_REQUESTS
2. **503 rate** - Indicates load shedding is active
3. **Kafka queue depth** - Should drain over time
4. **Memory usage** - Should be stable
5. **CPU usage** - Should be < 80% for headroom

## Production Deployment

1. **Use release build:**
```bash
cargo build --release
```

2. **Container deployment:**
```dockerfile
FROM rust:1.75-slim as builder
# ... build steps ...
FROM debian:bookworm-slim
COPY --from=builder /app/target/release/ingestion-service /usr/local/bin/
CMD ["ingestion-service"]
```

3. **Load balancing:**
- Deploy multiple instances behind L4 load balancer
- Use sticky sessions if needed
- Health check on `/health`

4. **Horizontal scaling:**
- Service is stateless - scale horizontally as needed
- Kafka handles load distribution automatically

## Why This Won't Crash

1. **Concurrency Limit:** Hard cap prevents OOM
2. **Load Shedding:** Fail fast (503) instead of queueing
3. **Timeouts:** Aggressive timeouts prevent resource leaks
4. **No Blocking:** All I/O is async
5. **Atomic Counters:** Lock-free tracking, no mutex contention
6. **Kafka Queue:** Internal buffer absorbs spikes
7. **Release Optimizations:** Maximum performance from compiled binary

## Tradeoffs

This design prioritizes **stability over guarantees**:
- ✅ Server never crashes under load
- ✅ Fast response times maintained
- ⚠️ Some requests rejected (503) when at capacity
- ⚠️ Fire-and-forget Kafka (possible message loss on broker failure)

For financial/critical systems, tune for stronger guarantees:
- Enable Kafka idempotence
- Use `acks=all`
- Implement fallback storage
- Add distributed tracing

