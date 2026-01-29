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

