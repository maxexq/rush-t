mod config;
mod errors;
mod handlers;
mod service;
mod state;

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
                .unwrap_or_else(|_| "flash_sale_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Configuration loaded: {:?}", config);

    // Initialize app state
    let state = AppState::new(config.clone())
        .expect("Failed to initialize application state");
    tracing::info!("Application state initialized");

    // Build router
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
        .with_state(state);

    // Start server
    let addr = config.server_addr();
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    tracing::info!("Flash Sale Service listening on {}", addr);

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

