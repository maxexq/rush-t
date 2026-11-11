package main

import (
	"context"
	"core-service/internal/handlers"
	"core-service/internal/repository"
	"core-service/internal/services"
	"core-service/internal/websocket"
	"core-service/pkg/kafka"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (ignore error if doesn't exist in production)
	_ = godotenv.Load()

	// Database connection
	dbURL := getEnv("DATABASE_URL", "postgres://admin:password123@localhost:5432/ticket_db")
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("[DB] Connected to PostgreSQL")

	// Initialize repositories
	eventRepo := repository.NewEventRepository(db)
	bookingRepo := repository.NewBookingRepository(db)
	seatRepo := repository.NewSeatRepository(db)

	// Initialize services
	grpcAddr := getEnv("GRPC_INVENTORY_ADDR", "localhost:50051")
	eventService := services.NewEventService(eventRepo, grpcAddr)
	bookingService := services.NewBookingService(bookingRepo)
	seatService := services.NewSeatService(seatRepo)

	// Initialize handlers
	eventHandler := handlers.NewEventHandler(eventService)
	bookingHandler := handlers.NewBookingHandler(bookingService)
	seatHandler := handlers.NewSeatHandler(seatService)

	// Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("[WS] Hub started")

	wsHandler := websocket.NewHandler(hub)

	// Initialize Kafka consumer
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")
	kafkaTopic := getEnv("KAFKA_TOPIC", "ticket_bookings")
	kafkaGroupID := getEnv("KAFKA_GROUP_ID", "core-service-group")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	kafkaConsumer, err := kafka.NewConsumer(
		kafka.ParseBrokers(kafkaBrokers),
		kafkaGroupID,
		kafkaTopic,
		bookingService,
		hub,
	)
	if err != nil {
		log.Printf("[Kafka] Warning: Failed to create consumer (will run without Kafka): %v", err)
	} else {
		defer kafkaConsumer.Close()
		// Start Kafka consumer
		kafkaConsumer.Start(ctx)
	}

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "TicketRush Core Service",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "core"})
	})

	// API v1 routes
	v1 := app.Group("/api/v1")

	// Event routes
	events := v1.Group("/events")
	events.Get("/", eventHandler.GetEvents)
	events.Get("/:id", eventHandler.GetEvent)
	events.Get("/:id/seats", seatHandler.GetEventSeats)
	
	// Admin route to initialize quota via gRPC
	events.Post("/initialize-quota", eventHandler.InitializeQuota)

	// User booking routes
	users := v1.Group("/users")
	users.Get("/:id/bookings", bookingHandler.GetUserBookings)

	// WebSocket route for real-time updates
	app.Get("/ws/events/:id", wsHandler.Upgrade())

	// Debug: Hub stats endpoint
	app.Get("/ws/stats", func(c *fiber.Ctx) error {
		return c.JSON(hub.GetStats())
	})

	// Start server in goroutine
	port := getEnv("PORT", "3000")
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("[Server] Listening on port %s", port)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	log.Println("[Shutdown] Graceful shutdown initiated...")

	// Cancel Kafka consumer context
	cancel()

	// Shutdown Fiber
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("[Shutdown] Error during server shutdown: %v", err)
	}

	log.Println("[Shutdown] Complete")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

