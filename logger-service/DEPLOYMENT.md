# Logger Service - Deployment Guide

## Quick Start (Docker Compose)

```bash
# From project root
cd deployments
docker-compose up -d logger-service

# Check logs
docker logs -f ticket_logger
```

## Standalone Deployment

### 1. Environment Setup

```bash
export KAFKA_BROKERS="kafka:9092"
export KAFKA_TOPICS="ticket_bookings,system_events"
export MONGODB_URI="mongodb://admin:password123@localhost:27017"
export MONGODB_DATABASE="ticketrush_audit"
```

### 2. Build & Run

```bash
cd logger-service
make build
./bin/logger-service
```

## Performance Tuning

### MongoDB Connection Pool
- Default: 10-50 connections
- Adjust in `cmd/consumer/main.go`:
  ```go
  SetMaxPoolSize(50)
  SetMinPoolSize(10)
  ```

### Batch Settings
- Default: 100 events or 2s timeout
- Adjust in `pkg/kafka/consumer.go`:
  ```go
  batchSize: 100
  batchTime: 2 * time.Second
  ```

### Kafka Consumer
- Modify `MinBytes`, `MaxBytes`, `MaxWait` in `pkg/kafka/consumer.go`

## Monitoring

### Health Check
MongoDB ping is performed on startup. Service will exit if connection fails.

### Logs
- Uses `zap` structured logging
- Log levels: Debug, Info, Warn, Error
- Batch flush operations logged at Info level

### Metrics (Future)
Add Prometheus metrics:
- `audit_logs_written_total`
- `audit_logs_batch_size`
- `audit_logs_write_latency`

## Troubleshooting

### Connection Issues
```bash
# Test Kafka
docker exec -it ticket_kafka kafka-topics --list --bootstrap-server localhost:9092

# Test MongoDB
docker exec -it ticket_mongo mongosh -u admin -p password123
```

### High Memory Usage
- Reduce `batchSize` to 50
- Lower `MaxPoolSize` to 25

### Slow Writes
- Check MongoDB indexes: `transaction_id`, `(service, timestamp)`, `timestamp`
- Increase batch size to 200

