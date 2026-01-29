package repository

import (
	"context"
	"core-service/internal/models"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BookingRepository struct {
	db *pgxpool.Pool
}

func NewBookingRepository(db *pgxpool.Pool) *BookingRepository {
	return &BookingRepository{db: db}
}

func (r *BookingRepository) CreateBooking(ctx context.Context, userID, seatID int64) (*models.Booking, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Get seat details (price and event_id)
	var basePrice float64
	var eventID int64
	err = tx.QueryRow(ctx, "SELECT base_price, event_id FROM seats WHERE id = $1", seatID).Scan(&basePrice, &eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seat details: %w", err)
	}

	// Update seat status to BOOKED
	_, err = tx.Exec(ctx, "UPDATE seats SET status = 'BOOKED' WHERE id = $1 AND status = 'LOCKED'", seatID)
	if err != nil {
		return nil, fmt.Errorf("failed to update seat status: %w", err)
	}

	// Generate booking reference
	bookingRef := uuid.New().String()[:8]
	now := time.Now()

	// Insert booking
	booking := &models.Booking{
		UserID:      userID,
		EventID:     eventID,
		SeatID:      seatID,
		BookingRef:  bookingRef,
		TotalAmount: basePrice,
		Status:      "PENDING_PAYMENT",
		LockedAt:    &now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO bookings (user_id, event_id, seat_id, booking_ref, total_amount, status, locked_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, booking.UserID, booking.EventID, booking.SeatID, booking.BookingRef, 
	   booking.TotalAmount, booking.Status, booking.LockedAt, booking.CreatedAt, booking.UpdatedAt).Scan(&booking.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return booking, nil
}

func (r *BookingRepository) GetUserBookings(ctx context.Context, userID int64) ([]*models.Booking, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, event_id, seat_id, booking_ref, total_amount, status, 
		       locked_at, confirmed_at, cancelled_at, created_at, updated_at
		FROM bookings
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []*models.Booking
	for rows.Next() {
		var b models.Booking
		err := rows.Scan(&b.ID, &b.UserID, &b.EventID, &b.SeatID, &b.BookingRef, &b.TotalAmount,
			&b.Status, &b.LockedAt, &b.ConfirmedAt, &b.CancelledAt, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			return nil, err
		}
		bookings = append(bookings, &b)
	}

	return bookings, nil
}

