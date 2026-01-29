// +build ignore

// Simple test producer to verify logger-service functionality
// Usage: go run test-producer.go

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/segmentio/kafka-go"
)

type TestEvent struct {
	TransactionID string      `json:"transaction_id"`
	Service       string      `json:"service"`
	Action        string      `json:"action"`
	Status        string      `json:"status"`
	Payload       interface{} `json:"payload"`
	Timestamp     time.Time   `json:"timestamp"`
	LatencyMS     int         `json:"latency_ms,omitempty"`
}

func main() {
	writer := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "ticket_bookings",
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond,
	}
	defer writer.Close()

	log.Println("Starting test event producer...")

	for i := 0; i < 1000; i++ {
		event := TestEvent{
			TransactionID: fmt.Sprintf("txn-%d", rand.Intn(10000)),
			Service:       []string{"flash-sale-service", "core-service", "ingestion-service"}[rand.Intn(3)],
			Action:        []string{"seat_locked", "payment_initiated", "booking_confirmed", "seat_released"}[rand.Intn(4)],
			Status:        []string{"success", "pending", "failed"}[rand.Intn(3)],
			Payload: map[string]interface{}{
				"event_id":  rand.Intn(100),
				"user_id":   rand.Intn(1000),
				"seat_id":   fmt.Sprintf("A-%d", rand.Intn(50)),
				"timestamp": time.Now().Unix(),
			},
			Timestamp: time.Now(),
			LatencyMS: rand.Intn(500),
		}

		data, _ := json.Marshal(event)
		err := writer.WriteMessages(context.Background(), kafka.Message{
			Value: data,
		})

		if err != nil {
			log.Printf("Failed to send message: %v", err)
		} else {
			log.Printf("Sent event %d: %s/%s", i+1, event.Service, event.Action)
		}

		time.Sleep(10 * time.Millisecond)
	}

	log.Println("Test complete!")
}

