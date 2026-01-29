# Core Service - TicketRush

Go-based manager service handling business logic and data persistence.

## Architecture

**Clean Architecture** with clear separation of concerns:

```
core-service/
├── cmd/
│   └── server/
│       └── main.go              # Entry point, wiring
├── internal/
│   ├── handlers/                # HTTP handlers (Fiber)
│   │   ├── event_handler.go
│   │   └── booking_handler.go
│   ├── services/                # Business logic
│   │   ├── event_service.go
│   │   └── booking_service.go
│   ├── repositories/            # Database layer
│   │   ├── event_repository.go
│   │   └── booking_repository.go
│   └── models/                  # Data models
│       └── models.go
├── pkg/
│   └── kafka/                   # Kafka consumer
│       └── consumer.go
├── Dockerfile
├── go.mod
└── README.md
```

## Tech Stack

- **Framework:** Fiber v2
- **Database:** PostgreSQL (pgx driver)
- **Messaging:** Kafka (IBM/sarama)
- **Config:** godotenv

## Key Features

### 1. Kafka Consumer (Background Worker)
- Listens to `ticket_bookings` topic
- Processes reservation messages: `{"seat_id": 123, "user_id": 456, "status": "reserved"}`
- Creates booking record with `PENDING_PAYMENT` status
- Updates seat status from `LOCKED` to `BOOKED`
- Graceful error handling (no crashes)

### 2. REST APIs

**Events:**
- `GET /api/v1/events` - List all upcoming concerts
- `GET /api/v1/events/:id` - Event details with venue info

**Bookings:**
- `GET /api/v1/users/:id/bookings` - User's booking history

**Health:**
- `GET /health` - Service health check

### 3. Graceful Shutdown
- Handles `SIGTERM/SIGINT`
- Closes Kafka consumer
- Shuts down HTTP server with timeout
- Closes DB connections

## Environment Variables

```bash
DATABASE_URL=postgres://admin:password123@postgres:5432/ticket_db
KAFKA_BROKERS=kafka:9092
KAFKA_TOPIC=ticket_bookings
KAFKA_GROUP_ID=core-service-group
PORT=3000
```

## Running Locally

```bash
# Install dependencies
go mod tidy

# Run
go run cmd/server/main.go
```

## Docker Build

```bash
docker build -t core-service .
```

## Critical Implementation Details

### Booking Creation Flow
1. Kafka message received with `seat_id`, `user_id`, `status`
2. Query seat to get `event_id` and `base_price`
3. Update seat status: `LOCKED` → `BOOKED`
4. Generate unique `booking_ref` (UUID-based)
5. Insert booking with `PENDING_PAYMENT` status
6. Transaction committed (or rolled back on error)

### Repository Pattern
- Each repository handles single entity
- Transactions managed at repository level
- Context propagation for cancellation

### Service Layer
- Orchestrates business logic
- No direct DB access
- Calls repositories

### Handler Layer
- Fiber context handling
- Parameter parsing/validation
- HTTP responses
- Calls services

## Notes

- Booking creation queries `event_id` from `seats` table (not passed in Kafka message)
- Consumer runs in separate goroutine from HTTP server
- All DB operations use context for timeout/cancellation
- Kafka consumer uses `sarama.ConsumerGroup` for balanced consumption

