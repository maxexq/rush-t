# Multi-stage build for high-performance ingestion service
FROM rustlang/rust:nightly-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    libssl-dev \
    libcurl4-openssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests
COPY ingestion-service/Cargo.toml ./

# Copy source
COPY ingestion-service/src ./src

# Build with full optimizations
RUN cargo build --release

# Runtime stage - minimal image
FROM rustlang/rust:nightly-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary
COPY --from=builder /app/target/release/ingestion-service /usr/local/bin/ingestion-service

# Increase file descriptor limit
RUN ulimit -n 1000000

EXPOSE 8080

CMD ["ingestion-service"]

