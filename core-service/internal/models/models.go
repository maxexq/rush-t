package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Venue struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	City      string    `json:"city"`
	Capacity  int       `json:"capacity"`
	CreatedAt time.Time `json:"created_at"`
}

type Event struct {
	ID             int64     `json:"id"`
	VenueID        int64     `json:"venue_id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	EventDate      time.Time `json:"event_date"`
	DoorsOpen      time.Time `json:"doors_open"`
	Status         string    `json:"status"`
	TotalSeats     int       `json:"total_seats"`
	AvailableSeats int       `json:"available_seats"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Venue          *Venue    `json:"venue,omitempty"`
}

type Seat struct {
	ID         int64   `json:"id"`
	EventID    int64   `json:"event_id"`
	SeatNumber string  `json:"seat_number"`
	RowLabel   string  `json:"row_label"`
	Zone       string  `json:"zone"`
	BasePrice  float64 `json:"base_price"`
	Status     string  `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

type Booking struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	EventID     int64      `json:"event_id"`
	SeatID      int64      `json:"seat_id"`
	BookingRef  string     `json:"booking_ref"`
	TotalAmount float64    `json:"total_amount"`
	Status      string     `json:"status"`
	LockedAt    *time.Time `json:"locked_at,omitempty"`
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty"`
	CancelledAt *time.Time `json:"cancelled_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Payment struct {
	ID              int64     `json:"id"`
	BookingID       int64     `json:"booking_id"`
	Amount          float64   `json:"amount"`
	PaymentMethod   string    `json:"payment_method"`
	TransactionID   string    `json:"transaction_id"`
	PaymentGateway  string    `json:"payment_gateway"`
	Status          string    `json:"status"`
	GatewayResponse string    `json:"gateway_response"`
	CreatedAt       time.Time `json:"created_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
}

// Kafka message structure
type TicketReservationMessage struct {
	SeatID int64  `json:"seat_id"`
	UserID int64  `json:"user_id"`
	Status string `json:"status"`
}

