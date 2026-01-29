.PHONY: build run release test lint fmt clean docker-build docker-up docker-down load-test help

build:
	cargo build

run:
	RUST_LOG=debug cargo run

release:
	cargo build --release

test:
	cargo test

lint:
	cargo clippy -- -D warnings

fmt:
	cargo fmt

clean:
	cargo clean

docker-build:
	docker build -t ingestion-service:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# Load test with 100k concurrent connections
load-test:
	@echo "Starting load test with 100,000 concurrent connections..."
	@echo "Make sure the service is running first!"
	wrk -t16 -c100000 -d60s --latency \
		-s tests/test-load.lua http://localhost:8080/api/v1/ingest

# Moderate load test
load-test-moderate:
	wrk -t8 -c10000 -d30s --latency \
		-s tests/test-load.lua http://localhost:8080/api/v1/ingest

# Check system limits
check-limits:
	@echo "Current ulimit (file descriptors):"
	@ulimit -n
	@echo ""
	@echo "Recommended for 100k connections: ulimit -n 1000000"
	@echo ""
	@echo "To increase: sudo sysctl -w fs.file-max=1000000"

help:
	@echo "High-Throughput Ingestion Service - Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build             - Build debug binary"
	@echo "  run               - Run in debug mode"
	@echo "  release           - Build optimized release binary"
	@echo "  test              - Run tests"
	@echo "  lint              - Run clippy linter"
	@echo "  fmt               - Format code"
	@echo "  clean             - Clean build artifacts"
	@echo ""
	@echo "Docker targets:"
	@echo "  docker-build      - Build Docker image"
	@echo "  docker-up         - Start services via docker-compose"
	@echo "  docker-down       - Stop services"
	@echo ""
	@echo "Load testing:"
	@echo "  load-test         - Run 100k connection load test (60s)"
	@echo "  load-test-moderate- Run 10k connection test (30s)"
	@echo "  check-limits      - Check system file descriptor limits"

