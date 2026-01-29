package repository

import (
	"context"
	"core-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EventRepository struct {
	db *pgxpool.Pool
}

func NewEventRepository(db *pgxpool.Pool) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) GetAll(ctx context.Context) ([]*models.Event, error) {
	rows, err := r.db.Query(ctx, `
		SELECT e.id, e.venue_id, e.title, e.description, e.event_date, e.doors_open,
		       e.status, e.total_seats, e.available_seats, e.created_at, e.updated_at,
		       v.id, v.name, v.city
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		WHERE e.status = 'UPCOMING'
		ORDER BY e.event_date ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.Event
	for rows.Next() {
		var e models.Event
		var v models.Venue
		err := rows.Scan(&e.ID, &e.VenueID, &e.Title, &e.Description, &e.EventDate, &e.DoorsOpen,
			&e.Status, &e.TotalSeats, &e.AvailableSeats, &e.CreatedAt, &e.UpdatedAt,
			&v.ID, &v.Name, &v.City)
		if err != nil {
			return nil, err
		}
		e.Venue = &v
		events = append(events, &e)
	}

	return events, nil
}

func (r *EventRepository) GetByID(ctx context.Context, id int64) (*models.Event, error) {
	var e models.Event
	var v models.Venue

	err := r.db.QueryRow(ctx, `
		SELECT e.id, e.venue_id, e.title, e.description, e.event_date, e.doors_open,
		       e.status, e.total_seats, e.available_seats, e.created_at, e.updated_at,
		       v.id, v.name, v.address, v.city, v.capacity
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		WHERE e.id = $1
	`, id).Scan(&e.ID, &e.VenueID, &e.Title, &e.Description, &e.EventDate, &e.DoorsOpen,
		&e.Status, &e.TotalSeats, &e.AvailableSeats, &e.CreatedAt, &e.UpdatedAt,
		&v.ID, &v.Name, &v.Address, &v.City, &v.Capacity)

	if err != nil {
		return nil, err
	}

	e.Venue = &v
	return &e, nil
}

