package websocket

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Handler struct {
	hub *Hub
}

func NewHandler(hub *Hub) *Handler {
	return &Handler{hub: hub}
}

// HandleWebSocket upgrades HTTP to WebSocket for specific event
func (h *Handler) HandleWebSocket(c *websocket.Conn) {
	// Extract event_id from URL params (already parsed by Fiber)
	eventIDStr := c.Params("id")
	eventID, err := strconv.ParseInt(eventIDStr, 10, 64)
	if err != nil {
		log.Printf("[WS] Invalid event_id: %s", eventIDStr)
		c.WriteMessage(websocket.CloseMessage, []byte("Invalid event ID"))
		c.Close()
		return
	}

	client := &Client{
		EventID: eventID,
		Send:    make(chan []byte, 256),
		Hub:     h.hub,
	}

	client.Hub.register <- client
	defer func() {
		client.Hub.unregister <- client
	}()

	// Start goroutine to write messages to WebSocket
	go client.writePump(c)

	// Read pump in main goroutine (blocks until connection closes)
	client.readPump(c)
}

// readPump pumps messages from WebSocket to hub
func (c *Client) readPump(conn *websocket.Conn) {
	defer func() {
		c.Hub.unregister <- c
		conn.Close()
	}()

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Read error: %v", err)
			}
			break
		}

		// Optional: Handle client messages (ping/pong, subscriptions)
		if messageType == websocket.TextMessage {
			log.Printf("[WS] Received from client (event_id=%d): %s", c.EventID, message)
		}
	}
}

// writePump pumps messages from hub to WebSocket
func (c *Client) writePump(conn *websocket.Conn) {
	defer func() {
		conn.Close()
	}()

	for message := range c.Send {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("[WS] Write error: %v", err)
			return
		}
	}
}

// Middleware to upgrade HTTP connection to WebSocket
func (h *Handler) Upgrade() fiber.Handler {
	return websocket.New(h.HandleWebSocket, websocket.Config{
		EnableCompression: true,
	})
}

