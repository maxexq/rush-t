# gRPC Integration - Cache Warm-up Feature

## Architecture Overview

```
┌─────────────────────────┐                    ┌──────────────────────────┐
│   Go Core Service       │                    │  Rust Flash Sale Service │
│   (gRPC Client)         │                    │  (gRPC Server)           │
│                         │                    │                          │
│  Port 3000 (REST)       │  gRPC (50051)      │  Port 3000 (REST)        │
│  Admin calls REST API ──┼────────────────────┼─> Tonic gRPC Server     │
└─────────────────────────┘                    └──────────────────────────┘
         │                                               │
         │                                               │
         └─────────────────── Redis ────────────────────┘
              (event:{id}:quota key)
```

## Protocol Buffers Definition

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

## Rust Implementation (Flash Sale Service)

### 1. Dependencies

**`Cargo.toml`**:
```toml
[dependencies]
tonic = "0.12"
prost = "0.13"
tokio-stream = "0.1"
# ... other dependencies

[build-dependencies]
tonic-build = "0.12"
```

### 2. Build Script

**`build.rs`**:
```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::compile_protos("../proto/inventory.proto")?;
    Ok(())
}
```

### 3. Concurrent Server Setup

The Rust service runs **TWO servers simultaneously**:
- **Axum HTTP** on port `3000` (for booking requests)
- **Tonic gRPC** on port `50051` (for admin commands)

**`main.rs`** (simplified):
```rust
#[tokio::main]
async fn main() {
    let state = AppState::new(config).expect("Failed to init state");

    // SERVER 1: Axum HTTP
    let app = Router::new()
        .route("/api/v1/book", post(book_seat_handler))
        .with_state(state.clone());
    
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await.expect("Failed to bind");

    // SERVER 2: Tonic gRPC
    let grpc_addr = "0.0.0.0:50051".parse().unwrap();
    let grpc_service = grpc_server::create_service(state.clone());

    // Run both concurrently (tokio::select! ensures non-blocking)
    tokio::select! {
        _ = axum::serve(listener, app) => {},
        _ = tonic::transport::Server::builder()
            .add_service(grpc_service)
            .serve(grpc_addr) => {}
    }
}
```

### 4. gRPC Handler

**`src/grpc_server.rs`**:
```rust
#[tonic::async_trait]
impl InventoryService for InventoryServiceImpl {
    async fn set_event_quota(
        &self,
        request: Request<SetQuotaRequest>,
    ) -> Result<Response<SetQuotaResponse>, Status> {
        let req = request.into_inner();
        
        let mut conn = self.state.redis_pool.get().await?;
        let key = format!("event:{}:quota", req.event_id);
        
        redis::cmd("SET")
            .arg(&key)
            .arg(req.quota)
            .query_async(&mut conn)
            .await?;

        Ok(Response::new(SetQuotaResponse {
            success: true,
            message: format!("Quota {} set", req.quota),
        }))
    }
}
```

## Go Implementation (Core Service)

### 1. Dependencies

Add to `go.mod`:
```
google.golang.org/grpc v1.60.0
google.golang.org/protobuf v1.31.0
```

Run:
```bash
go get google.golang.org/grpc
go get google.golang.org/protobuf
```

### 2. Code Generation

**Option A: Using Script**

Create `scripts/generate-proto.sh`:
```bash
#!/bin/bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    -I ../proto \
    ../proto/inventory.proto

mkdir -p pkg/proto/inventory
mv *.pb.go pkg/proto/inventory/
```

**Option B: Using Makefile**

Add to `Makefile`:
```makefile
.PHONY: proto

proto:
	@echo "Generating Go code from proto..."
	protoc --go_out=. --go_opt=paths=source_relative \
	    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	    -I ../proto \
	    ../proto/inventory.proto
	mkdir -p pkg/proto/inventory
	mv *.pb.go pkg/proto/inventory/
	@echo "✓ Proto generation complete"
```

Run: `make proto`

### 3. gRPC Client Wrapper

**`internal/grpc_client/inventory_client.go`**:
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

type InventoryClient struct {
	conn   *grpc.ClientConn
	client pb.InventoryServiceClient
}

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
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	return &InventoryClient{
		conn:   conn,
		client: pb.NewInventoryServiceClient(conn),
	}, nil
}

func (c *InventoryClient) SetEventQuota(eventID string, quota int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := &pb.SetQuotaRequest{
		EventId: eventID,
		Quota:   int32(quota),
	}

	resp, err := c.client.SetEventQuota(ctx, req)
	if err != nil {
		return fmt.Errorf("grpc call failed: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("quota setting failed: %s", resp.Message)
	}

	return nil
}

func (c *InventoryClient) Close() error {
	return c.conn.Close()
}
```

### 4. Integration with Event Service

**`internal/services/event_service.go`**:
```go
type EventService struct {
	repo        *repository.EventRepository
	grpcClient  *grpc_client.InventoryClient
	grpcEnabled bool
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

func (s *EventService) InitializeEventQuota(eventID string, quota int) error {
	if !s.grpcEnabled {
		return nil
	}
	return s.grpcClient.SetEventQuota(eventID, quota)
}
```

### 5. Admin REST Handler

**`internal/handlers/event_handler.go`**:
```go
func (h *EventHandler) InitializeQuota(c *fiber.Ctx) error {
	var req struct {
		EventID string `json:"event_id"`
		Quota   int    `json:"quota"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	err := h.service.InitializeEventQuota(req.EventID, req.Quota)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}
```

**Route**: `POST /api/v1/events/initialize-quota`

### 6. Main Setup

**`cmd/server/main.go`**:
```go
func main() {
	eventRepo := repository.NewEventRepository(db)
	
	grpcAddr := getEnv("GRPC_INVENTORY_ADDR", "localhost:50051")
	eventService := services.NewEventService(eventRepo, grpcAddr)
	
	eventHandler := handlers.NewEventHandler(eventService)
	
	// Routes
	events.Post("/initialize-quota", eventHandler.InitializeQuota)
}
```

## Environment Variables

**Go Service**:
```bash
GRPC_INVENTORY_ADDR=localhost:50051   # or flash-sale-service:50051 in Docker
```

**Rust Service**:
```bash
SERVER_PORT=3000   # HTTP server
# gRPC runs on 50051 (hardcoded)
```

## Testing

### 1. Start Rust Service
```bash
cd flash-sale-service
cargo build --release
cargo run
```

Output:
```
✓ Axum HTTP Server listening on 0.0.0.0:3000
✓ Tonic gRPC Server listening on 0.0.0.0:50051
```

### 2. Start Go Service
```bash
cd core-service
make proto  # Generate Go code first
go run cmd/server/main.go
```

### 3. Call Admin API
```bash
curl -X POST http://localhost:3000/api/v1/events/initialize-quota \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_12345",
    "quota": 5000
  }'
```

Response:
```json
{
  "success": true,
  "message": "Quota 5000 initialized for event evt_12345"
}
```

### 4. Verify in Redis
```bash
redis-cli
> GET event:evt_12345:quota
"5000"
```

## Docker Compose Integration

```yaml
services:
  flash-sale-service:
    ports:
      - "3001:3000"   # HTTP
      - "50051:50051" # gRPC
  
  core-service:
    environment:
      - GRPC_INVENTORY_ADDR=flash-sale-service:50051
    depends_on:
      - flash-sale-service
```

## Key Concepts

1. **Concurrent Servers**: `tokio::select!` runs Axum and Tonic without blocking
2. **Shared State**: Both servers share the same `AppState` (Redis pool)
3. **Synchronous Communication**: gRPC for immediate cache warm-up
4. **Admin-Only**: This endpoint should be protected with auth in production
5. **Redis Key Pattern**: `event:{id}:quota` stores the inventory count
