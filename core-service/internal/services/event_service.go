package services

import (
	"context"
	"core-service/internal/models"
	"core-service/internal/repository"
)

type EventService struct {
	repo *repository.EventRepository
}

func NewEventService(repo *repository.EventRepository) *EventService {
	return &EventService{repo: repo}
}

func (s *EventService) GetAllEvents(ctx context.Context) ([]*models.Event, error) {
	return s.repo.GetAll(ctx)
}

func (s *EventService) GetEventByID(ctx context.Context, id int64) (*models.Event, error) {
	return s.repo.GetByID(ctx, id)
}

