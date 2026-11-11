package repository

import (
	"context"
	"core-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SeatRepository struct {
	db *pgxpool.Pool
}

func NewSeatRepository(db *pgxpool.Pool) *SeatRepository {
	return &SeatRepository{db: db}
}

func (r *SeatRepository) GetByEventID(ctx context.Context, eventID int64) ([]*models.Seat, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, event_id, seat_number, row_label, zone, base_price, status, created_at
		FROM seats
		WHERE event_id = $1
		ORDER BY zone, row_label, seat_number
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var seats []*models.Seat
	for rows.Next() {
		var s models.Seat
		err := rows.Scan(&s.ID, &s.EventID, &s.SeatNumber, &s.RowLabel, &s.Zone, &s.BasePrice, &s.Status, &s.CreatedAt)
		if err != nil {
			return nil, err
		}
		seats = append(seats, &s)
	}

	if seats == nil {
		seats = []*models.Seat{}
	}

	return seats, nil
}

