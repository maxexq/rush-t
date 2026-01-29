package handlers

import (
	"core-service/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type BookingHandler struct {
	service *services.BookingService
}

func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (h *BookingHandler) GetUserBookings(c *fiber.Ctx) error {
	userID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	bookings, err := h.service.GetUserBookings(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch bookings"})
	}

	return c.JSON(bookings)
}

