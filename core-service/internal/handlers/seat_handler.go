package handlers

import (
	"core-service/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type SeatHandler struct {
	service *services.SeatService
}

func NewSeatHandler(service *services.SeatService) *SeatHandler {
	return &SeatHandler{service: service}
}

func (h *SeatHandler) GetEventSeats(c *fiber.Ctx) error {
	eventID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid event ID"})
	}

	seats, err := h.service.GetSeatsByEventID(c.Context(), eventID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Return frontend-compatible format
	type SeatResponse struct {
		ID         string  `json:"id"`
		EventID    string  `json:"event_id"`
		Section    string  `json:"section"`
		Row        string  `json:"row"`
		Number     int     `json:"number"`
		Price      float64 `json:"price"`
		Status     string  `json:"status"`
		LockedBy   *string `json:"locked_by,omitempty"`
		LockedUntil *string `json:"locked_until,omitempty"`
	}

	response := make([]SeatResponse, len(seats))
	for i, seat := range seats {
		// Parse seat_number to int
		seatNum, _ := strconv.Atoi(seat.SeatNumber)
		
		response[i] = SeatResponse{
			ID:      strconv.FormatInt(seat.ID, 10),
			EventID: strconv.FormatInt(seat.EventID, 10),
			Section: seat.Zone,
			Row:     seat.RowLabel,
			Number:  seatNum,
			Price:   seat.BasePrice,
			Status:  mapStatus(seat.Status),
		}
	}

	return c.JSON(response)
}

func mapStatus(dbStatus string) string {
	switch dbStatus {
	case "AVAILABLE":
		return "available"
	case "LOCKED":
		return "locked"
	case "BOOKED":
		return "sold"
	default:
		return "available"
	}
}

