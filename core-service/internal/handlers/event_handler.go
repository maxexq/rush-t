package handlers

import (
	"core-service/internal/models"
	"core-service/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type EventHandler struct {
	service *services.EventService
}

func NewEventHandler(service *services.EventService) *EventHandler {
	return &EventHandler{service: service}
}

func (h *EventHandler) GetEvents(c *fiber.Ctx) error {
	events, err := h.service.GetAllEvents(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if events == nil {
		events = []*models.Event{}
	}
	return c.JSON(events)
}

func (h *EventHandler) GetEvent(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid event ID"})
	}

	event, err := h.service.GetEventByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Event not found"})
	}

	return c.JSON(event)
}
