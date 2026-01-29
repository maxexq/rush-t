# Multi-stage build for minimal image size
FROM rust:1.84-slim as builder

# Install dependencies for rdkafka
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests
COPY Cargo.toml ./

# Copy source
COPY src ./src

# Build release binary
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/flash-sale-service /usr/local/bin/flash-sale-service

EXPOSE 8080

CMD ["flash-sale-service"]

