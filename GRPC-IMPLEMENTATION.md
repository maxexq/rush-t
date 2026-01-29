# gRPC Implementation Summary - TicketRush Cache Warm-up

## Overview
Added gRPC for synchronous inter-service communication. Go Core Service (client) commands Rust Flash Sale Service (server) to initialize Redis inventory cache.

---

## Task 1: Protocol Buffers ✓

**File**: `proto/inventory.proto`

```protobuf
syntax = "proto3";

package inventory;

service InventoryService {
  rpc SetEventQuota(SetQuotaRequest) returns (SetQuotaResponse);
}

message SetQuotaRequest {
  string event_id = 1;
  int32 quota = 2;
}

message SetQuotaResponse {
  bool success = 1;
  string message = 2;
}
```

---

## Task 2: Rust Implementation (Server) ✓

### 2.1 Dependencies

**File**: `flash-sale-service/Cargo.toml`

```toml
[package]
name = "flash-sale-service"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
tower = "0.4"
tower-http = { version = "0.5", features = ["trace", "cors"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
dotenvy = "0.15"
rdkafka = { version = "0.36", features = ["cmake-build"] }
deadpool-redis = { version = "0.15", features = ["rt_tokio_1"] }
redis = { version = "0.25", features = ["tokio-comp", "connection-manager"] }
chrono = { version = "=0.4.38", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
tonic = "0.12"
prost = "0.13"
tokio-stream = "0.1"

[build-dependencies]
tonic-build = "0.12"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

**File**: `flash-sale-service/build.rs`

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::compile_protos("../proto/inventory.proto")?;
    Ok(())
}
```

### 2.2 Concurrent Server Setup (Axum + Tonic)

**File**: `flash-sale-service/src/main.rs`

```rust
mod config;
mod errors;
mod handlers;
mod service;
mod state;
mod grpc_server;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::handlers::{book_seat_handler, health_handler};
use crate::state::AppState;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "flash_sale_service=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Configuration loaded: {:?}", config);

    // Initialize app state (shared by both servers)
    let state = AppState::new(config.clone())
        .expect("Failed to initialize application state");
    tracing::info!("Application state initialized");

    // ============================================================
    // SERVER 1: Axum HTTP Server (for booking requests)
    // ============================================================
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/book", post(book_seat_handler))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let http_addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(http_addr)
        .await
        .expect("Failed to bind HTTP server");

    tracing::info!("✓ Axum HTTP Server listening on {}", http_addr);

    // ============================================================
    // SERVER 2: Tonic gRPC Server (for admin commands)
    // ============================================================
    let grpc_addr = "0.0.0.0:50051".parse().expect("Invalid gRPC address");
    let grpc_service = grpc_server::create_service(state.clone());
    
    tracing::info!("✓ Tonic gRPC Server listening on {}", grpc_addr);

    // ============================================================
    // Run both servers concurrently (non-blocking)
    // ============================================================
    tracing::info!("Starting both servers...");
    
    tokio::select! {
        result = axum::serve(listener, app) => {
            if let Err(e) = result {
                tracing::error!("Axum HTTP server error: {}", e);
            }
        }
        result = tonic::transport::Server::builder()
            .add_service(grpc_service)
            .serve(grpc_addr) => {
            if let Err(e) = result {
                tracing::error!("Tonic gRPC server error: {}", e);
            }
        }
    }
}
```

**Key Points**:
- **Line 39**: `state.clone()` - Both servers share the same Redis pool
- **Line 50**: Axum runs on port **3000**
- **Line 57**: Tonic runs on port **50051**
- **Line 64**: `tokio::select!` runs both servers **concurrently without blocking**

### 2.3 gRPC Handler Implementation

**File**: `flash-sale-service/src/grpc_server.rs`

```rust
use tonic::{Request, Response, Status};
use crate::state::AppState;

pub mod inventory {
    tonic::include_proto!("inventory");
}

use inventory::{
    inventory_service_server::{InventoryService, InventoryServiceServer},
    SetQuotaRequest, SetQuotaResponse,
};

pub struct InventoryServiceImpl {
    state: AppState,
}

impl InventoryServiceImpl {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }
}

#[tonic::async_trait]
impl InventoryService for InventoryServiceImpl {
    async fn set_event_quota(
        &self,
        request: Request<SetQuotaRequest>,
    ) -> Result<Response<SetQuotaResponse>, Status> {
        let req = request.into_inner();
        
        tracing::info!(
            "gRPC SetEventQuota: event_id={}, quota={}",
            req.event_id,
            req.quota
        );

        let mut conn = self.state.redis_pool.get().await
            .map_err(|e| Status::internal(format!("Redis connection failed: {}", e)))?;

        // Set quota in Redis
        let key = format!("event:{}:quota", req.event_id);
        redis::cmd("SET")
            .arg(&key)
            .arg(req.quota)
            .query_async::<_, ()>(&mut conn)
            .await
            .map_err(|e| Status::internal(format!("Failed to set quota: {}", e)))?;

        tracing::info!("Successfully set quota for event {}", req.event_id);

        Ok(Response::new(SetQuotaResponse {
            success: true,
            message: format!("Quota {} set for event {}", req.quota, req.event_id),
        }))
    }
}

pub fn create_service(state: AppState) -> InventoryServiceServer<InventoryServiceImpl> {
    InventoryServiceServer::new(InventoryServiceImpl::new(state))
}
```

---

## Task 3: Go Implementation (Client) ✓

### 3.1 Dependencies

Add to `core-service/go.mod`:

```bash
go get google.golang.org/grpc@latest
go get google.golang.org/protobuf@latest
```

### 3.2 Code Generation

**Option A - Script**: `core-service/scripts/generate-proto.sh`

```bash
#!/bin/bash

# Install protoc-gen-go and protoc-gen-go-grpc if not present
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate Go code from proto
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    -I ../proto \
    ../proto/inventory.proto

# Move generated files to proper location
mkdir -p pkg/proto/inventory
mv *.pb.go pkg/proto/inventory/ 2>/dev/null || true

echo "Proto generation complete"
```

**Option B - Makefile**: `core-service/Makefile`

```makefile
.PHONY: proto build run clean

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		../proto/inventory.proto
	mkdir -p pkg/proto/inventory
	mv inventory.pb.go pkg/proto/inventory/
	mv inventory_grpc.pb.go pkg/proto/inventory/

build:
	go build -o bin/core-service ./cmd/server

run:
	go run ./cmd/server/main.go

clean:
	rm -rf bin/
	rm -rf pkg/proto/
```

**Usage**:
```bash
cd core-service
make proto    # Generate Go code
make build    # Build binary
make run      # Run server
```

### 3.3 gRPC Client Wrapper

**File**: `core-service/internal/grpc_client/inventory_client.go`

```go
package grpc_client

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "core-service/pkg/proto/inventory"
)

// InventoryClient wraps the gRPC client for the Rust Inventory Service
type InventoryClient struct {
	conn   *grpc.ClientConn
	client pb.InventoryServiceClient
}

// NewInventoryClient creates a new gRPC client connection to the Rust service
// serverAddr should be in format "host:port", e.g., "localhost:50051" or "flash-sale-service:50051"
func NewInventoryClient(serverAddr string) (*InventoryClient, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(
		ctx,
		serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to inventory service at %s: %w", serverAddr, err)
	}

	return &InventoryClient{
		conn:   conn,
		client: pb.NewInventoryServiceClient(conn),
	}, nil
}

// SetEventQuota calls the Rust gRPC server to initialize the event quota in Redis
// This is used by Admin operations to warm up the cache before a sale starts
func (c *InventoryClient) SetEventQuota(eventID string, quota int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := &pb.SetQuotaRequest{
		EventId: eventID,
		Quota:   int32(quota),
	}

	resp, err := c.client.SetEventQuota(ctx, req)
	if err != nil {
		return fmt.Errorf("grpc SetEventQuota call failed: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("quota setting failed: %s", resp.Message)
	}

	return nil
}

// Close closes the gRPC connection
func (c *InventoryClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
```

### 3.4 Integration with Admin Handler

**File**: `core-service/internal/services/event_service.go` (additions)

```go
package services

import (
	"context"
	"core-service/internal/models"
	"core-service/internal/repository"
	"core-service/internal/grpc_client"
)

type EventService struct {
	repo          *repository.EventRepository
	grpcClient    *grpc_client.InventoryClient
	grpcEnabled   bool
}

func NewEventService(repo *repository.EventRepository, grpcAddr string) *EventService {
	var client *grpc_client.InventoryClient
	enabled := false
	
	if grpcAddr != "" {
		c, err := grpc_client.NewInventoryClient(grpcAddr)
		if err == nil {
			client = c
			enabled = true
		}
	}
	
	return &EventService{
		repo:        repo,
		grpcClient:  client,
		grpcEnabled: enabled,
	}
}

// ... existing methods ...

// InitializeEventQuota calls the Rust gRPC service to warm up Redis cache
func (s *EventService) InitializeEventQuota(eventID string, quota int) error {
	if !s.grpcEnabled {
		return nil // gRPC not configured, skip cache warm-up
	}

	return s.grpcClient.SetEventQuota(eventID, quota)
}
```

**File**: `core-service/internal/handlers/event_handler.go` (additions)

```go
// InitializeQuota is the Admin endpoint to warm up Redis cache via gRPC
func (h *EventHandler) InitializeQuota(c *fiber.Ctx) error {
	var req struct {
		EventID string `json:"event_id"`
		Quota   int    `json:"quota"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.EventID == "" || req.Quota <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "event_id and quota (>0) are required"})
	}

	err := h.service.InitializeEventQuota(req.EventID, req.Quota)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Quota %d initialized for event %s", req.Quota, req.EventID),
	})
}
```

**File**: `core-service/cmd/server/main.go` (modifications)

```go
func main() {
	// ... database setup ...
	
	eventRepo := repository.NewEventRepository(db)
	bookingRepo := repository.NewBookingRepository(db)

	// Initialize services with gRPC client
	grpcAddr := getEnv("GRPC_INVENTORY_ADDR", "localhost:50051")
	eventService := services.NewEventService(eventRepo, grpcAddr)
	bookingService := services.NewBookingService(bookingRepo)

	// Initialize handlers
	eventHandler := handlers.NewEventHandler(eventService)
	bookingHandler := handlers.NewBookingHandler(bookingService)

	// ... fiber app setup ...

	// Event routes
	events := v1.Group("/events")
	events.Get("/", eventHandler.GetEvents)
	events.Get("/:id", eventHandler.GetEvent)
	
	// Admin route to initialize quota via gRPC
	events.Post("/initialize-quota", eventHandler.InitializeQuota)

	// ... rest of setup ...
}
```

---

## Testing the Integration

### Step 1: Start Rust Service

```bash
cd flash-sale-service
cargo build --release
cargo run
```

**Expected Output**:
```
✓ Axum HTTP Server listening on 0.0.0.0:3000
✓ Tonic gRPC Server listening on 0.0.0.0:50051
Starting both servers...
```

### Step 2: Generate Go Proto Code

```bash
cd core-service
make proto
```

### Step 3: Start Go Service

```bash
cd core-service
export GRPC_INVENTORY_ADDR=localhost:50051
go run cmd/server/main.go
```

### Step 4: Call Admin API

```bash
curl -X POST http://localhost:3000/api/v1/events/initialize-quota \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_12345",
    "quota": 5000
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Quota 5000 initialized for event evt_12345"
}
```

### Step 5: Verify in Redis

```bash
redis-cli
> GET event:evt_12345:quota
"5000"
```

---

## Environment Variables

### Go Core Service
```bash
GRPC_INVENTORY_ADDR=localhost:50051        # Local
GRPC_INVENTORY_ADDR=flash-sale-service:50051  # Docker
```

### Rust Flash Sale Service
```bash
SERVER_PORT=3000   # HTTP (Axum)
# gRPC runs on port 50051 (hardcoded in main.rs)
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Admin User                            │
└───────────────────────┬──────────────────────────────────┘
                        │ POST /api/v1/events/initialize-quota
                        ▼
┌──────────────────────────────────────────────────────────┐
│         Go Core Service (Port 3000)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Handler: InitializeQuota()                        │  │
│  │     ↓                                               │  │
│  │  Service: InitializeEventQuota()                   │  │
│  │     ↓                                               │  │
│  │  gRPC Client: SetEventQuota()                      │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │ gRPC Call (Port 50051)
                        │ SetQuotaRequest { event_id, quota }
                        ▼
┌──────────────────────────────────────────────────────────┐
│    Rust Flash Sale Service                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │  HTTP Server (Axum) - Port 3000                    │  │
│  │  - /api/v1/book                                    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  gRPC Server (Tonic) - Port 50051                  │  │
│  │  - SetEventQuota handler                           │  │
│  │     ↓                                               │  │
│  │  Redis: SET event:{id}:quota {value}               │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │    Redis    │
                 │  (Cache)    │
                 └─────────────┘
```

---

## Files Created/Modified

### Created:
1. `proto/inventory.proto` - Protocol Buffers definition
2. `flash-sale-service/build.rs` - Proto compilation
3. `flash-sale-service/src/grpc_server.rs` - gRPC server implementation
4. `core-service/internal/grpc_client/inventory_client.go` - gRPC client wrapper
5. `core-service/Makefile` - Build automation
6. `core-service/scripts/generate-proto.sh` - Proto generation script
7. `core-service/README-GRPC.md` - Documentation
8. `GRPC-IMPLEMENTATION.md` - This summary

### Modified:
1. `flash-sale-service/Cargo.toml` - Added tonic, prost, tokio-stream
2. `flash-sale-service/src/main.rs` - Concurrent Axum + Tonic servers
3. `core-service/internal/services/event_service.go` - Added gRPC integration
4. `core-service/internal/handlers/event_handler.go` - Added admin endpoint
5. `core-service/cmd/server/main.go` - Added gRPC client initialization

---

## Key Technical Decisions

1. **Concurrent Servers**: Used `tokio::select!` to run Axum and Tonic without blocking
2. **Shared State**: Both servers access the same Redis pool via `AppState.clone()`
3. **Error Handling**: gRPC failures are logged but don't crash the Go service
4. **Port Allocation**: HTTP on 3000, gRPC on 50051 (industry standard)
5. **Security**: Using insecure credentials for local dev (should use TLS in production)

---

## Production Considerations

1. **Add TLS**: Use `tonic::transport::Certificate` for secure gRPC
2. **Auth**: Protect admin endpoint with JWT/API keys
3. **Metrics**: Add Prometheus metrics for gRPC calls
4. **Retry Logic**: Implement exponential backoff for failed gRPC calls
5. **Health Checks**: Add gRPC health check service
6. **Connection Pooling**: Reuse gRPC connections instead of creating per-request

---

## Troubleshooting

**Issue**: `failed to connect to inventory service`
- Check Rust service is running on port 50051
- Verify firewall allows gRPC traffic
- Check `GRPC_INVENTORY_ADDR` environment variable

**Issue**: `Proto generation failed`
- Install `protoc`: `brew install protobuf` (Mac) or `apt install protobuf-compiler` (Linux)
- Install Go plugins: `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`

**Issue**: `Redis connection failed`
- Ensure Redis is running
- Check Redis URL in Rust service config

---

**Implementation Complete** ✓

