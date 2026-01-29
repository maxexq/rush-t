# Kafka Load Testing Guide

## Overview
Load test Kafka message processing using multiple approaches.

## Prerequisites
```bash
# Ensure containers are running
docker-compose ps

# Check Kafka is healthy
docker exec ticket_kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Method 1: PowerShell Script (Recommended for Windows)

### Basic Test (100 msg/sec for 60 seconds)
```powershell
.\produce-kafka-load.ps1
```

### High Volume Test (500 msg/sec for 120 seconds)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 500 -Duration 120
```

### Stress Test (1000 msg/sec for 60 seconds)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 1000 -Duration 60
```

## Method 2: k6 with Kafka Extension (Advanced)

### Install xk6-kafka
```bash
# Requires Go installed
go install go.k6.io/xk6/cmd/xk6@latest
xk6 build --with github.com/mostafa/xk6-kafka@latest
```

### Run k6 Kafka Load Test
```bash
./k6 run k6-kafka-test.js
```

## Method 3: Simple API Load Test
```bash
k6 run k6-simple-test.js
```

## Monitoring

### 1. Kafka UI
**URL:** http://localhost:8080
- Topics → ticket_bookings → Messages
- View consumer lag
- Monitor throughput

### 2. Application Logs
```bash
docker logs -f ticket_core_service
```

### 3. Kafka Consumer Group
```bash
docker exec ticket_kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group core-service-group \
  --describe
```

## Test Scenarios

### Scenario 1: Baseline (100 msg/sec)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 100 -Duration 60
```

### Scenario 2: Medium Load (500 msg/sec)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 500 -Duration 120
```

### Scenario 3: High Load (1000 msg/sec)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 1000 -Duration 60
```

### Scenario 4: Burst Test (2000 msg/sec for 30s)
```powershell
.\produce-kafka-load.ps1 -MessagesPerSec 2000 -Duration 30
```

## Metrics to Monitor

1. **Kafka Metrics:**
   - Message throughput (msg/sec)
   - Consumer lag
   - Partition distribution

2. **Database Metrics:**
   - Connection pool usage
   - Query latency
   - Transaction throughput

3. **Application Metrics:**
   - Processing time per message
   - Error rate
   - Memory/CPU usage

## Troubleshooting

### Consumer Lag Increasing
```bash
# Check consumer status
docker exec ticket_kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group core-service-group \
  --describe
```

### Messages Not Processing
```bash
# Check service logs
docker logs ticket_core_service --tail 100 -f

# Verify Kafka connectivity
docker exec ticket_kafka kafka-broker-api-versions \
  --bootstrap-server localhost:9092
```

### Database Bottleneck
```bash
# Check PostgreSQL connections
docker exec ticket_postgres psql -U admin -d ticket_db \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

## Expected Results

| Messages/sec | Expected Lag | CPU Usage | Notes |
|-------------|--------------|-----------|-------|
| 100 | <10 | Low | Baseline |
| 500 | <50 | Medium | Normal load |
| 1000 | <200 | High | Peak load |
| 2000+ | >500 | Very High | Stress test |

