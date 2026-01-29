mod config;
mod errors;
mod handlers;
mod service;
mod state;
mod grpc_server;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::handlers::{book_seat_handler, health_handler};
use crate::state::AppState;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "flash_sale_service=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Configuration loaded: {:?}", config);

    // Initialize app state (shared by both servers)
    let state = AppState::new(config.clone())
        .expect("Failed to initialize application state");
    tracing::info!("Application state initialized");

    // ============================================================
    // SERVER 1: Axum HTTP Server (for booking requests)
    // ============================================================
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/book", post(book_seat_handler))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let http_addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(http_addr)
        .await
        .expect("Failed to bind HTTP server");

    tracing::info!("✓ Axum HTTP Server listening on {}", http_addr);

    // ============================================================
    // SERVER 2: Tonic gRPC Server (for admin commands)
    // ============================================================
    let grpc_addr = "0.0.0.0:50051".parse().expect("Invalid gRPC address");
    let grpc_service = grpc_server::create_service(state.clone());
    
    tracing::info!("✓ Tonic gRPC Server listening on {}", grpc_addr);

    // ============================================================
    // Run both servers concurrently (non-blocking)
    // ============================================================
    tracing::info!("Starting both servers...");
    
    tokio::select! {
        result = axum::serve(listener, app) => {
            if let Err(e) = result {
                tracing::error!("Axum HTTP server error: {}", e);
            }
        }
        result = tonic::transport::Server::builder()
            .add_service(grpc_service)
            .serve(grpc_addr) => {
            if let Err(e) = result {
                tracing::error!("Tonic gRPC server error: {}", e);
            }
        }
    }
}

