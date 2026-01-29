package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/spf13/viper"
	"github.com/ticketrush/logger-service/internal/repository"
	"github.com/ticketrush/logger-service/pkg/kafka"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/etc/logger-service/")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Set defaults
	viper.SetDefault("kafka.brokers", "localhost:9092")
	viper.SetDefault("kafka.topics", "ticket_bookings,system_events")
	viper.SetDefault("kafka.group_id", "logger-service-group")
	viper.SetDefault("mongodb.uri", "mongodb://localhost:27017")
	viper.SetDefault("mongodb.database", "ticketrush_audit")

	if err := viper.ReadInConfig(); err != nil {
		logger.Warn("No config file found, using environment variables", zap.Error(err))
	}

	// MongoDB connection
	mongoURI := viper.GetString("mongodb.uri")
	dbName := viper.GetString("mongodb.database")

	clientOptions := options.Client().
		ApplyURI(mongoURI).
		SetMaxPoolSize(50).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(30 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		logger.Fatal("Failed to connect to MongoDB", zap.Error(err))
	}
	defer mongoClient.Disconnect(context.Background())

	// Verify connection
	if err := mongoClient.Ping(ctx, nil); err != nil {
		logger.Fatal("MongoDB ping failed", zap.Error(err))
	}
	logger.Info("Connected to MongoDB", zap.String("database", dbName))

	db := mongoClient.Database(dbName)
	repo := repository.NewAuditRepository(db, logger)

	// Kafka consumer
	brokers := strings.Split(viper.GetString("kafka.brokers"), ",")
	topics := strings.Split(viper.GetString("kafka.topics"), ",")
	groupID := viper.GetString("kafka.group_id")

	consumer := kafka.NewConsumer(brokers, topics, groupID, repo, logger)

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger.Info("Starting logger service",
		zap.Strings("brokers", brokers),
		zap.Strings("topics", topics),
		zap.String("group_id", groupID),
	)

	if err := consumer.Start(ctx); err != nil {
		logger.Error("Consumer stopped with error", zap.Error(err))
		os.Exit(1)
	}

	logger.Info("Logger service shutdown complete")
}

