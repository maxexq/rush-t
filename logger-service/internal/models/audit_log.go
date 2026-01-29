package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuditLog struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	TransactionID string             `bson:"transaction_id"` // correlation id
	Service       string             `bson:"service"`        // e.g., "flash-sale-service"
	Action        string             `bson:"action"`         // e.g., "seat_locked"
	Status        string             `bson:"status"`
	Payload       interface{}        `bson:"payload"`       // Flexible JSON data
	Timestamp     time.Time          `bson:"timestamp"`
	LatencyMS     int                `bson:"latency_ms,omitempty"`
}

// KafkaMessage represents the incoming Kafka event structure
type KafkaMessage struct {
	TransactionID string      `json:"transaction_id"`
	Service       string      `json:"service"`
	Action        string      `json:"action"`
	Status        string      `json:"status"`
	Payload       interface{} `json:"payload"`
	Timestamp     time.Time   `json:"timestamp"`
	LatencyMS     int         `json:"latency_ms,omitempty"`
}

