mod config;
mod errors;
mod handlers;
mod middleware;
mod state;

use axum::{routing::post, Router};
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::handlers::ingest_handler;
use crate::middleware::ConcurrencyLimitLayer;
use crate::state::AppState;

#[tokio::main(flavor = "multi_thread", worker_threads = 16)]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ingestion_service=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();
    tracing::info!("Starting high-throughput ingestion service");
    tracing::info!("Max concurrent requests: {}", config.max_concurrent_requests);

    // Initialize AppState with singleton Kafka producer
    let state = AppState::new(config.clone())
        .expect("Failed to initialize application state");

    // Build middleware stack (ORDER MATTERS - applied bottom to top)
    let middleware = ServiceBuilder::new()
        // 1. TRACING: Monitor requests (applied first, wraps everything)
        .layer(TraceLayer::new_for_http())
        // 2. CORS: Handle CORS early
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        // 3. GLOBAL TIMEOUT: Kill slow requests (prevents connection exhaustion)
        // WHY: Clients that timeout on their side might not close the TCP connection.
        // After 10s, we forcibly drop the connection to free up resources.
        .layer(TimeoutLayer::new(Duration::from_secs(10)))
        // 4. CONCURRENCY LIMIT + LOAD SHEDDING: The Critical Layer
        // WHY: This is the "circuit breaker". When concurrent requests exceed limit,
        // immediately return 503 (fail fast) instead of queuing or crashing.
        // This prevents OOM and keeps the server alive under extreme load.
        .layer(ConcurrencyLimitLayer::new(config.max_concurrent_requests));

    // Build application router
    let app = Router::new()
        .route("/api/v1/ingest", post(ingest_handler))
        .route("/health", axum::routing::get(handlers::health_handler))
        .layer(middleware)
        .with_state(state);

    // CRITICAL: Hyper server configuration for C100k problem
    let listener = tokio::net::TcpListener::bind(&config.server_addr())
        .await
        .expect("Failed to bind to address");

    tracing::info!("Listening on {}", config.server_addr());

    // Use axum::serve with custom HTTP/2 configuration
    // WHY HTTP/2: Multiplexing allows thousands of concurrent streams over fewer TCP connections
    // WHY keep_alive: Prevents silent connection deaths, allows reuse
    // WHY max_concurrent_streams: Limits per-connection streams to prevent DoS
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    // TCP settings for high concurrency
    .tcp_nodelay(true) // Disable Nagle's algorithm for lower latency
    .tcp_keepalive(Some(Duration::from_secs(60))) // Keep TCP connections alive
    .http2_keep_alive_interval(Some(Duration::from_secs(20))) // HTTP/2 ping frames
    .http2_keep_alive_timeout(Duration::from_secs(10))
    .http2_max_concurrent_streams(Some(1000)) // Limit streams per connection
    .http2_max_frame_size(Some(16384)) // Default frame size
    .http2_max_header_list_size(Some(16384)) // Limit header size
    .await
    .expect("Server failed");
}

/// Graceful shutdown handler
async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    tracing::info!("Shutdown signal received, draining connections...");
}

