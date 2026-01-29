package services

import (
	"context"
	"core-service/internal/models"
	"core-service/internal/repository"
)

type SeatService struct {
	repo *repository.SeatRepository
}

func NewSeatService(repo *repository.SeatRepository) *SeatService {
	return &SeatService{repo: repo}
}

func (s *SeatService) GetSeatsByEventID(ctx context.Context, eventID int64) ([]*models.Seat, error) {
	return s.repo.GetByEventID(ctx, eventID)
}

