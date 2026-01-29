.PHONY: build run dev test lint fmt clean docker-build docker-up docker-down load-test

build:
	cargo build --release

run:
	cargo run --release

dev:
	RUST_LOG=debug cargo watch -x run

test:
	cargo test

lint:
	cargo clippy -- -D warnings

fmt:
	cargo fmt

clean:
	cargo clean

docker-build:
	docker build -t flash-sale-service:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

load-test:
	wrk -t12 -c400 -d30s --latency \
		-s tests/load-test.lua http://localhost:8080/api/v1/book

help:
	@echo "Available targets:"
	@echo "  build        - Build release binary"
	@echo "  run          - Run release binary"
	@echo "  dev          - Run in development mode with auto-reload"
	@echo "  test         - Run tests"
	@echo "  lint         - Run clippy linter"
	@echo "  fmt          - Format code"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-up    - Start services via docker-compose"
	@echo "  docker-down  - Stop services"
	@echo "  load-test    - Run load test with wrk"

