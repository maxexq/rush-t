package main

import (
	"context"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func main() {
	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://admin:password123@postgres:5432/ticket_db"
	}

	var err error
	db, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize schema
	initSchema()

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Ticket Core Service",
	})

	app.Use(logger.New())
	app.Use(cors.New())

	// Routes
	app.Get("/health", healthCheck)

	// Event routes
	events := app.Group("/events")
	events.Get("/", getEvents)
	events.Get("/:id", getEvent)
	events.Post("/", createEvent)

	// Ticket routes
	tickets := app.Group("/tickets")
	tickets.Get("/event/:eventId", getTicketsByEvent)
	tickets.Post("/", createTicket)

	log.Fatal(app.Listen(":3000"))
}

func initSchema() {
	schema := `
	CREATE TABLE IF NOT EXISTS events (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		description TEXT,
		venue VARCHAR(255),
		event_date TIMESTAMP NOT NULL,
		total_tickets INT NOT NULL,
		available_tickets INT NOT NULL,
		price DECIMAL(10,2) NOT NULL,
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS tickets (
		id SERIAL PRIMARY KEY,
		event_id INT REFERENCES events(id),
		user_id VARCHAR(255) NOT NULL,
		status VARCHAR(50) DEFAULT 'reserved',
		created_at TIMESTAMP DEFAULT NOW()
	);
	`
	_, err := db.Exec(context.Background(), schema)
	if err != nil {
		log.Fatal("Failed to initialize schema:", err)
	}
}

func healthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}

// Event handlers
func getEvents(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(), "SELECT id, name, description, venue, event_date, total_tickets, available_tickets, price FROM events")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var events []fiber.Map
	for rows.Next() {
		var id, totalTickets, availableTickets int
		var name, description, venue string
		var eventDate interface{}
		var price float64
		rows.Scan(&id, &name, &description, &venue, &eventDate, &totalTickets, &availableTickets, &price)
		events = append(events, fiber.Map{
			"id": id, "name": name, "description": description, "venue": venue,
			"event_date": eventDate, "total_tickets": totalTickets, "available_tickets": availableTickets, "price": price,
		})
	}
	return c.JSON(events)
}

func getEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	var event struct {
		ID               int
		Name             string
		Description      string
		Venue            string
		EventDate        interface{}
		TotalTickets     int
		AvailableTickets int
		Price            float64
	}
	err := db.QueryRow(context.Background(),
		"SELECT id, name, description, venue, event_date, total_tickets, available_tickets, price FROM events WHERE id = $1", id).
		Scan(&event.ID, &event.Name, &event.Description, &event.Venue, &event.EventDate, &event.TotalTickets, &event.AvailableTickets, &event.Price)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Event not found"})
	}
	return c.JSON(event)
}

func createEvent(c *fiber.Ctx) error {
	var input struct {
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		Venue        string  `json:"venue"`
		EventDate    string  `json:"event_date"`
		TotalTickets int     `json:"total_tickets"`
		Price        float64 `json:"price"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	var id int
	err := db.QueryRow(context.Background(),
		"INSERT INTO events (name, description, venue, event_date, total_tickets, available_tickets, price) VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING id",
		input.Name, input.Description, input.Venue, input.EventDate, input.TotalTickets, input.Price).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id})
}

// Ticket handlers
func getTicketsByEvent(c *fiber.Ctx) error {
	eventId := c.Params("eventId")
	rows, err := db.Query(context.Background(), "SELECT id, event_id, user_id, status, created_at FROM tickets WHERE event_id = $1", eventId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var tickets []fiber.Map
	for rows.Next() {
		var id, eventID int
		var userID, status string
		var createdAt interface{}
		rows.Scan(&id, &eventID, &userID, &status, &createdAt)
		tickets = append(tickets, fiber.Map{"id": id, "event_id": eventID, "user_id": userID, "status": status, "created_at": createdAt})
	}
	return c.JSON(tickets)
}

func createTicket(c *fiber.Ctx) error {
	var input struct {
		EventID int    `json:"event_id"`
		UserID  string `json:"user_id"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	tx, err := db.Begin(context.Background())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer tx.Rollback(context.Background())

	// Check availability
	var available int
	err = tx.QueryRow(context.Background(), "SELECT available_tickets FROM events WHERE id = $1 FOR UPDATE", input.EventID).Scan(&available)
	if err != nil || available <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No tickets available"})
	}

	// Decrement available tickets
	_, err = tx.Exec(context.Background(), "UPDATE events SET available_tickets = available_tickets - 1 WHERE id = $1", input.EventID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create ticket
	var ticketID int
	err = tx.QueryRow(context.Background(), "INSERT INTO tickets (event_id, user_id) VALUES ($1, $2) RETURNING id", input.EventID, input.UserID).Scan(&ticketID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	tx.Commit(context.Background())
	return c.Status(201).JSON(fiber.Map{"id": ticketID})
}

