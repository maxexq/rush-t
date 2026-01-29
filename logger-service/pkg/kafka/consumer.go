package kafka

import (
	"context"
	"encoding/json"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/ticketrush/logger-service/internal/models"
	"github.com/ticketrush/logger-service/internal/repository"
	"go.uber.org/zap"
)

type Consumer struct {
	reader     *kafka.Reader
	repo       *repository.AuditRepository
	logger     *zap.Logger
	batchSize  int
	batchTime  time.Duration
}

func NewConsumer(brokers []string, topics []string, groupID string, repo *repository.AuditRepository, logger *zap.Logger) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		GroupTopics:    topics,
		GroupID:        groupID,
		MinBytes:       1024,        // 1KB
		MaxBytes:       10485760,    // 10MB
		CommitInterval: time.Second, // Auto-commit interval
		StartOffset:    kafka.LastOffset,
		MaxWait:        500 * time.Millisecond,
	})

	return &Consumer{
		reader:    reader,
		repo:      repo,
		logger:    logger,
		batchSize: 100,              // Batch size for DB writes
		batchTime: 2 * time.Second,  // Max time to wait for batch
	}
}

func (c *Consumer) Start(ctx context.Context) error {
	c.logger.Info("Starting Kafka consumer")
	
	batch := make([]models.AuditLog, 0, c.batchSize)
	ticker := time.NewTicker(c.batchTime)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Shutting down consumer")
			// Flush remaining batch
			if len(batch) > 0 {
				c.flushBatch(context.Background(), batch)
			}
			return c.reader.Close()

		case <-ticker.C:
			// Flush batch on timer
			if len(batch) > 0 {
				c.flushBatch(ctx, batch)
				batch = batch[:0] // Clear batch
			}

		default:
			// Read message with timeout
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				if err == context.Canceled {
					return nil
				}
				c.logger.Error("Failed to fetch message", zap.Error(err))
				time.Sleep(100 * time.Millisecond)
				continue
			}

			// Parse message
			var kafkaMsg models.KafkaMessage
			if err := json.Unmarshal(msg.Value, &kafkaMsg); err != nil {
				c.logger.Warn("Failed to parse message", zap.Error(err), zap.ByteString("value", msg.Value))
				c.reader.CommitMessages(ctx, msg)
				continue
			}

			// Convert to AuditLog
			auditLog := models.AuditLog{
				TransactionID: kafkaMsg.TransactionID,
				Service:       kafkaMsg.Service,
				Action:        kafkaMsg.Action,
				Status:        kafkaMsg.Status,
				Payload:       kafkaMsg.Payload,
				Timestamp:     kafkaMsg.Timestamp,
				LatencyMS:     kafkaMsg.LatencyMS,
			}

			batch = append(batch, auditLog)

			// Commit message
			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				c.logger.Error("Failed to commit message", zap.Error(err))
			}

			// Flush batch if full
			if len(batch) >= c.batchSize {
				c.flushBatch(ctx, batch)
				batch = batch[:0] // Clear batch
				ticker.Reset(c.batchTime)
			}
		}
	}
}

func (c *Consumer) flushBatch(ctx context.Context, batch []models.AuditLog) {
	dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := c.repo.BatchInsert(dbCtx, batch); err != nil {
		c.logger.Error("Failed to flush batch", zap.Error(err), zap.Int("size", len(batch)))
	} else {
		c.logger.Info("Flushed batch", zap.Int("size", len(batch)))
	}
}

