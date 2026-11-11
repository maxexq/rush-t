# Multi-stage build for minimal image size
FROM rustlang/rust:nightly-slim as builder

# Install dependencies for rdkafka
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    libssl-dev \
    libcurl4-openssl-dev \
    pkg-config \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy proto files
COPY proto/inventory.proto ./proto/

# Copy manifests
COPY flash-sale-service/Cargo.toml ./
COPY flash-sale-service/build.rs ./

# Copy source
COPY flash-sale-service/src ./src

# Build release binary
RUN cargo build --release

# Runtime stage
FROM rustlang/rust:nightly-slim

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

