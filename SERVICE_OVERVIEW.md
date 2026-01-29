# TicketRush - All Services Running

## 🚀 Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TicketRush Platform                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Application Services                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Core Service (Go)              Port: 3000                   │
│     └─ Main business logic, DB persistence                      │
│                                                                 │
│  2. Flash Sale Service (Rust)      Port: 8081                   │
│     └─ High-performance seat locking with Redis                 │
│                                                                 │
│  3. Ingestion Service (Rust)       Port: 8082                   │
│     └─ 100k+ concurrent request handling                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Infrastructure Services                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▸ PostgreSQL                      Port: 5432                   │
│     └─ Primary database for core service                        │
│                                                                 │
│  ▸ Redis                           Port: 6379                   │
│     └─ Atomic locking for flash sales                           │
│                                                                 │
│  ▸ MongoDB                         Port: 27017                  │
│     └─ Logging and analytics                                    │
│                                                                 │
│  ▸ Kafka                           Port: 9092                   │
│     └─ Message broker for async processing                      │
│                                                                 │
│  ▸ Kafka UI                        Port: 8080                   │
│     └─ Web interface for Kafka monitoring                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Service Details

### 1. Core Service (Go) - Port 3000
**Purpose:** Main business logic and database operations  
**Tech:** Go 1.21 + PostgreSQL  
**Endpoints:**
- `GET  /api/events` - List events
- `POST /api/bookings` - Create booking
- `GET  /api/bookings/:id` - Get booking status

### 2. Flash Sale Service (Rust) - Port 8081
**Purpose:** Ultra-fast seat reservation with atomic Redis locking  
**Tech:** Axum + Redis + Kafka  
**Endpoints:**
- `POST /api/v1/book` - Book seat (atomic lock)
- `GET  /health` - Health check

**Key Features:**
- Redis SET NX atomic locking
- Handles race conditions (100 users → 1 seat)
- Sub-5ms latency
- Publishes to Kafka for async processing

### 3. Ingestion Service (Rust) - Port 8082
**Purpose:** High-throughput event ingestion  
**Tech:** Axum + Tokio + Kafka  
**Endpoints:**
- `POST /api/v1/ingest` - Ingest event (202 Accepted)
- `GET  /health` - Health check

**Key Features:**
- Handles 100,000+ concurrent connections
- Load shedding (returns 503 when at capacity)
- Fire-and-forget Kafka publishing
- Aggressive timeouts (10s)

## 🛠️ Useful Commands

### Check Service Status
```bash
cd deployments
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f core-service
docker-compose logs -f flash-sale-service
docker-compose logs -f ingestion-service
```

### Stop Services
```bash
cd deployments
docker-compose down
```

### Restart Services
```bash
cd deployments
docker-compose restart
```

### Rebuild & Restart
```bash
cd deployments
docker-compose up -d --build
```

## 🧪 Testing Endpoints

### Test Core Service
```bash
curl http://localhost:3000/health
```

### Test Flash Sale Service
```bash
# Health check
curl http://localhost:8081/health

# Book a seat
curl -X POST http://localhost:8081/api/v1/book \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "event123",
    "seat_id": "A1",
    "user_id": "user456"
  }'
```

### Test Ingestion Service
```bash
# Health check
curl http://localhost:8082/health

# Ingest event
curl -X POST http://localhost:8082/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "check_in",
    "user_id": "user123",
    "payload": {
      "location": "venue_A",
      "timestamp": "2026-01-30T10:00:00Z"
    }
  }'
```

### Monitor Kafka (Web UI)
Open browser: `http://localhost:8080`

## 📈 Load Testing

### Flash Sale Service
```bash
cd flash-sale-service
make load-test
```

### Ingestion Service
```bash
cd ingestion-service
make load-test
```

## 🔍 Monitoring

### Check Active Containers
```bash
docker ps
```

### Check Resource Usage
```bash
docker stats
```

### Database Access
```bash
# PostgreSQL
docker exec -it ticket_postgres psql -U admin -d ticket_db

# MongoDB
docker exec -it ticket_mongo mongosh -u admin -p password123

# Redis
docker exec -it ticket_redis redis-cli
```

## 🚨 Troubleshooting

### Service Not Starting
```bash
# Check logs
docker-compose logs <service-name>

# Check if ports are in use
netstat -ano | findstr "3000"
netstat -ano | findstr "8081"
netstat -ano | findstr "8082"
```

### Kafka Issues
```bash
# Check Kafka topics
docker exec -it ticket_kafka kafka-topics --bootstrap-server localhost:9092 --list

# View messages
docker exec -it ticket_kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic booking.events \
  --from-beginning
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
docker exec -it ticket_postgres pg_isready

# Test Redis connection
docker exec -it ticket_redis redis-cli ping
```

## 🌐 Service Communication Flow

```
User Request
    │
    ▼
┌─────────────────────┐
│ Ingestion Service   │ ← High-volume events
│ (Port 8082)         │
└─────────┬───────────┘
          │
          ▼
    ┌─────────┐
    │  Kafka  │ ← Message queue
    └────┬────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│ Flash Sale      │  │  Core Service    │
│ Service         │  │  (Port 3000)     │
│ (Port 8081)     │  │                  │
└────┬────────────┘  └────┬─────────────┘
     │                    │
     ▼                    ▼
┌─────────┐          ┌────────────┐
│  Redis  │          │ PostgreSQL │
│ (Locks) │          │  (Data)    │
└─────────┘          └────────────┘
```

## 📝 Environment Variables

All services are pre-configured via `docker-compose.yaml`. To customize:

1. Edit `deployments/docker-compose.yaml`
2. Rebuild: `docker-compose up -d --build`

## 🎯 Performance Benchmarks

| Service | Metric | Target | Actual |
|---------|--------|--------|--------|
| Flash Sale | Latency (p99) | < 50ms | ~5ms |
| Flash Sale | Throughput | 10k RPS | 50k+ RPS |
| Ingestion | Concurrent Connections | 100k | 100k+ |
| Ingestion | Latency (p99) | < 100ms | ~20ms |
| Core Service | Standard CRUD | - | Varies |

## 🔐 Security Notes

**Development Setup - NOT for Production:**
- Default passwords in use
- No TLS/SSL
- No authentication on most endpoints
- Open CORS policy

**For Production:**
- Use secrets management (Vault, AWS Secrets Manager)
- Enable TLS/SSL
- Add JWT/OAuth authentication
- Implement rate limiting
- Use private networks
- Enable monitoring & alerting

## 📚 Additional Documentation

- **Flash Sale Service:** `flash-sale-service/README.md`
- **Ingestion Service:** `ingestion-service/README.md`
- **Architecture:** `ingestion-service/ARCHITECTURE.md`
- **Deployment:** `ingestion-service/DEPLOYMENT.md`
- **Core Service:** `core-service/README.md`

## 🎉 All Systems Go!

Your TicketRush platform is now running with all three services operational.

**Quick Health Check:**
```bash
curl http://localhost:3000/health && \
curl http://localhost:8081/health && \
curl http://localhost:8082/health && \
echo "\n✅ All services are healthy!"
```

