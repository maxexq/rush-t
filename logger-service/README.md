# Logger Service

Background consumer service for auditing and monitoring high-velocity events.

## Features

- **Batch Processing**: Accumulates events (100 per batch or 2s timeout) before writing to MongoDB
- **High Throughput**: Connection pooling (10-50 connections) and unordered inserts
- **Multi-Topic Support**: Consumes from `ticket_bookings` and `system_events`
- **Graceful Shutdown**: Flushes pending batches on SIGTERM

## Configuration

Environment variables:
- `KAFKA_BROKERS`: Kafka broker list (default: `localhost:9092`)
- `KAFKA_TOPICS`: Comma-separated topics (default: `ticket_bookings,system_events`)
- `KAFKA_GROUP_ID`: Consumer group ID (default: `logger-service-group`)
- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DATABASE`: Database name (default: `ticketrush_audit`)

## Build & Run

```bash
# Local
make build
make run

# Docker
make docker-build
make docker-run
```

## MongoDB Schema

Collection: `audit_logs`
- Indexes: `transaction_id`, `(service, timestamp)`, `timestamp`

