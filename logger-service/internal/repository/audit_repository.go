package repository

import (
	"context"
	"time"

	"github.com/ticketrush/logger-service/internal/models"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type AuditRepository struct {
	collection *mongo.Collection
	logger     *zap.Logger
}

func NewAuditRepository(db *mongo.Database, logger *zap.Logger) *AuditRepository {
	collection := db.Collection("audit_logs")
	
	// Create indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	indexes := []mongo.IndexModel{
		{
			Keys: map[string]interface{}{
				"transaction_id": 1,
			},
		},
		{
			Keys: map[string]interface{}{
				"service": 1,
				"timestamp": -1,
			},
		},
		{
			Keys: map[string]interface{}{
				"timestamp": -1,
			},
		},
	}
	
	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		logger.Warn("Failed to create indexes", zap.Error(err))
	}
	
	return &AuditRepository{
		collection: collection,
		logger:     logger,
	}
}

// BatchInsert inserts multiple audit logs in a single operation
func (r *AuditRepository) BatchInsert(ctx context.Context, logs []models.AuditLog) error {
	if len(logs) == 0 {
		return nil
	}
	
	documents := make([]interface{}, len(logs))
	for i, log := range logs {
		documents[i] = log
	}
	
	opts := options.InsertMany().SetOrdered(false) // Continue on error
	_, err := r.collection.InsertMany(ctx, documents, opts)
	
	if err != nil {
		r.logger.Error("Batch insert failed", zap.Error(err), zap.Int("count", len(logs)))
		return err
	}
	
	r.logger.Debug("Batch inserted audit logs", zap.Int("count", len(logs)))
	return nil
}

