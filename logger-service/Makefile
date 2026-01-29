.PHONY: build run docker-build docker-run clean test

build:
	go build -o bin/logger-service ./cmd/consumer

run:
	go run ./cmd/consumer/main.go

docker-build:
	docker build -t logger-service:latest .

docker-run:
	docker run --rm \
		-e KAFKA_BROKERS=kafka:9092 \
		-e KAFKA_TOPICS=ticket_bookings,system_events \
		-e MONGODB_URI=mongodb://mongodb:27017 \
		-e MONGODB_DATABASE=ticketrush_audit \
		logger-service:latest

clean:
	rm -rf bin/

test:
	go test -v ./...

deps:
	go mod download
	go mod tidy

