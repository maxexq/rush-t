package services

import (
	"context"
	"core-service/internal/models"
	"core-service/internal/repository"
	"log"
)

type BookingService struct {
	repo *repository.BookingRepository
}

func NewBookingService(repo *repository.BookingRepository) *BookingService {
	return &BookingService{repo: repo}
}

func (s *BookingService) ProcessReservation(ctx context.Context, msg *models.TicketReservationMessage) error {
	log.Printf("[BookingService] Processing reservation: UserID=%d, SeatID=%d, Status=%s", 
		msg.UserID, msg.SeatID, msg.Status)

	if msg.Status != "reserved" {
		log.Printf("[BookingService] Skipping non-reserved status: %s", msg.Status)
		return nil
	}

	booking, err := s.repo.CreateBooking(ctx, msg.UserID, msg.SeatID)
	if err != nil {
		log.Printf("[BookingService] Failed to create booking: %v", err)
		return err
	}

	log.Printf("[BookingService] Booking created successfully: ID=%d, Ref=%s", booking.ID, booking.BookingRef)
	return nil
}

func (s *BookingService) GetUserBookings(ctx context.Context, userID int64) ([]*models.Booking, error) {
	return s.repo.GetUserBookings(ctx, userID)
}

