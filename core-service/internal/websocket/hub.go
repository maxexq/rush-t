package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Client represents a WebSocket connection
type Client struct {
	EventID int64
	Send    chan []byte
	Hub     *Hub
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	// Map of eventID -> clients
	clients map[int64]map[*Client]bool
	
	// Inbound messages from clients
	broadcast chan BroadcastMessage
	
	// Register requests from clients
	register chan *Client
	
	// Unregister requests from clients
	unregister chan *Client
	
	mu sync.RWMutex
}

type BroadcastMessage struct {
	EventID int64
	Data    []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[int64]map[*Client]bool),
		broadcast:  make(chan BroadcastMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.EventID] == nil {
				h.clients[client.EventID] = make(map[*Client]bool)
			}
			h.clients[client.EventID][client] = true
			h.mu.Unlock()
			log.Printf("[WS Hub] Client registered for event_id=%d (total: %d)", 
				client.EventID, len(h.clients[client.EventID]))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.EventID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.Send)
					log.Printf("[WS Hub] Client unregistered for event_id=%d (remaining: %d)", 
						client.EventID, len(clients))
					
					// Clean up empty event maps
					if len(clients) == 0 {
						delete(h.clients, client.EventID)
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.EventID]
			h.mu.RUnlock()
			
			if clients != nil {
				count := 0
				for client := range clients {
					select {
					case client.Send <- message.Data:
						count++
					default:
						// Client's send buffer is full, close it
						go func(c *Client) {
							h.unregister <- c
						}(client)
					}
				}
				log.Printf("[WS Hub] Broadcasted to %d clients for event_id=%d", count, message.EventID)
			}
		}
	}
}

// Broadcast sends message to all clients subscribed to specific event
func (h *Hub) Broadcast(eventID int64, messageType string, data interface{}) {
	payload := map[string]interface{}{
		"type": messageType,
		"data": data,
	}
	
	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[WS Hub] Failed to marshal broadcast message: %v", err)
		return
	}
	
	h.broadcast <- BroadcastMessage{
		EventID: eventID,
		Data:    jsonData,
	}
}

// GetStats returns current connection stats
func (h *Hub) GetStats() map[string]interface{} {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	totalClients := 0
	eventStats := make(map[int64]int)
	
	for eventID, clients := range h.clients {
		count := len(clients)
		totalClients += count
		eventStats[eventID] = count
	}
	
	return map[string]interface{}{
		"total_clients": totalClients,
		"events":        eventStats,
	}
}

