#!/bin/bash

# Script to produce high-volume Kafka messages for load testing
# Usage: ./produce-kafka-load.sh [messages_per_second] [duration_seconds]

MESSAGES_PER_SEC=${1:-100}
DURATION=${2:-60}
TOPIC="ticket_bookings"

echo "Starting Kafka load test:"
echo "  Messages/sec: $MESSAGES_PER_SEC"
echo "  Duration: $DURATION seconds"
echo "  Topic: $TOPIC"
echo "  Total messages: $((MESSAGES_PER_SEC * DURATION))"
echo ""

start_time=$(date +%s)
end_time=$((start_time + DURATION))
message_count=0

while [ $(date +%s) -lt $end_time ]; do
  batch_start=$(date +%s%3N)
  
  # Produce messages in parallel batches
  for i in $(seq 1 $MESSAGES_PER_SEC); do
    {
      seat_id=$((RANDOM % 100 + 1))
      user_id=$((RANDOM % 1000 + 1))
      timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      
      echo "{\"seat_id\": $seat_id, \"user_id\": $user_id, \"status\": \"reserved\", \"timestamp\": \"$timestamp\"}"
    } &
  done | docker exec -i ticket_kafka kafka-console-producer \
    --bootstrap-server localhost:9092 \
    --topic $TOPIC \
    --request-timeout-ms 1000 2>/dev/null
  
  message_count=$((message_count + MESSAGES_PER_SEC))
  
  # Rate limiting - sleep remainder of second
  batch_end=$(date +%s%3N)
  elapsed=$((batch_end - batch_start))
  sleep_time=$((1000 - elapsed))
  
  if [ $sleep_time -gt 0 ]; then
    sleep $(echo "scale=3; $sleep_time/1000" | bc)
  fi
  
  # Progress update every 5 seconds
  current_time=$(date +%s)
  if [ $((current_time % 5)) -eq 0 ]; then
    echo "Progress: $message_count messages sent"
  fi
done

echo ""
echo "Load test complete!"
echo "Total messages sent: $message_count"
echo "Actual rate: $(echo "scale=2; $message_count/$DURATION" | bc) msg/sec"
echo ""
echo "Check Kafka UI at: http://localhost:8080"

