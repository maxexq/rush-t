package kafka

import (
	"context"
	"core-service/internal/models"
	"core-service/internal/services"
	"encoding/json"
	"log"
	"strings"

	"github.com/IBM/sarama"
)

type Consumer struct {
	consumer       sarama.ConsumerGroup
	bookingService *services.BookingService
	topic          string
}

func NewConsumer(brokers []string, groupID, topic string, bookingService *services.BookingService) (*Consumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetNewest

	consumer, err := sarama.NewConsumerGroup(brokers, groupID, config)
	if err != nil {
		return nil, err
	}

	return &Consumer{
		consumer:       consumer,
		bookingService: bookingService,
		topic:          topic,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) {
	handler := &consumerGroupHandler{
		bookingService: c.bookingService,
	}

	go func() {
		for {
			select {
			case <-ctx.Done():
				log.Println("[Kafka] Consumer context cancelled, stopping...")
				return
			default:
				if err := c.consumer.Consume(ctx, []string{c.topic}, handler); err != nil {
					log.Printf("[Kafka] Consumer error: %v", err)
				}
			}
		}
	}()

	log.Printf("[Kafka] Consumer started, listening to topic: %s", c.topic)
}

func (c *Consumer) Close() error {
	return c.consumer.Close()
}

type consumerGroupHandler struct {
	bookingService *services.BookingService
}

func (h *consumerGroupHandler) Setup(sarama.ConsumerGroupSession) error {
	return nil
}

func (h *consumerGroupHandler) Cleanup(sarama.ConsumerGroupSession) error {
	return nil
}

func (h *consumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for message := range claim.Messages() {
		log.Printf("[Kafka] Received message: Topic=%s, Partition=%d, Offset=%d, Value=%s",
			message.Topic, message.Partition, message.Offset, string(message.Value))

		var msg models.TicketReservationMessage
		if err := json.Unmarshal(message.Value, &msg); err != nil {
			log.Printf("[Kafka] Failed to unmarshal message: %v", err)
			session.MarkMessage(message, "")
			continue
		}

		// Process the reservation
		if err := h.bookingService.ProcessReservation(session.Context(), &msg); err != nil {
			log.Printf("[Kafka] Failed to process reservation: %v", err)
			// In production, you might want to push to a DLQ or retry queue
		}

		session.MarkMessage(message, "")
	}

	return nil
}

// Helper to parse brokers from comma-separated string
func ParseBrokers(brokerStr string) []string {
	return strings.Split(brokerStr, ",")
}

