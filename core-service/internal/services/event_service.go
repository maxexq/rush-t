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

func (s *EventService) GetAllEvents(ctx context.Context) ([]*models.Event, error) {
	return s.repo.GetAll(ctx)
}

func (s *EventService) GetEventByID(ctx context.Context, id int64) (*models.Event, error) {
	return s.repo.GetByID(ctx, id)
}

// InitializeEventQuota calls the Rust gRPC service to warm up Redis cache
func (s *EventService) InitializeEventQuota(eventID string, quota int) error {
	if !s.grpcEnabled {
		return nil // gRPC not configured, skip cache warm-up
	}

	return s.grpcClient.SetEventQuota(eventID, quota)
}

