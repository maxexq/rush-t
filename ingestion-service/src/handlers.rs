use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

use crate::errors::{AppError, Result};
use crate::state::AppState;

/// Ingestion payload - lightweight structure
#[derive(Debug, Deserialize, Serialize)]
pub struct IngestRequest {
    pub event_type: String,
    pub user_id: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct IngestResponse {
    pub accepted: bool,
    pub message: String,
}

/// HIGH-THROUGHPUT INGESTION HANDLER
/// 
/// ARCHITECTURE: "Shock Absorber" Pattern
/// WHY: This handler does MINIMAL work to maximize throughput:
/// 1. Lightweight validation (no DB calls, no complex business logic)
/// 2. Push to Kafka (async, non-blocking)
/// 3. Return 202 Accepted immediately
///
/// This decouples ingestion from processing, allowing:
/// - 100k+ concurrent users to be accepted
/// - Backend processing happens asynchronously via Kafka consumers
/// - No back-pressure from slow DB or business logic
pub async fn ingest_handler(
    State(state): State<AppState>,
    Json(request): Json<IngestRequest>,
) -> Result<(StatusCode, Json<IngestResponse>)> {
    // VALIDATION: Keep it minimal for speed
    // WHY: Every microsecond counts at 100k RPS
    if request.event_type.is_empty() || request.user_id.is_empty() {
        return Err(AppError::BadRequest("Missing required fields".to_string()));
    }

    // Enforce payload size limit to prevent memory exhaustion
    // WHY: Large payloads can cause OOM under extreme load
    let payload_str = serde_json::to_string(&request.payload)
        .map_err(|_| AppError::BadRequest("Invalid JSON payload".to_string()))?;
    
    if payload_str.len() > 10_000 {
        return Err(AppError::BadRequest("Payload too large (max 10KB)".to_string()));
    }

    // Prepare Kafka event
    let event = serde_json::json!({
        "event_type": request.event_type,
        "user_id": request.user_id,
        "payload": request.payload,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    let event_json = serde_json::to_string(&event)
        .map_err(|_| AppError::InternalError)?;

    let kafka_key = format!("{}:{}", request.event_type, request.user_id);

    // CRITICAL: Async, non-blocking Kafka send
    // WHY: We spawn this to avoid blocking the response
    // If Kafka is slow, we still return 202 to client
    // The internal queue will handle buffering
    tokio::spawn(async move {
        if let Err(e) = state.send_event(&kafka_key, &event_json).await {
            tracing::error!("Failed to send to Kafka: {}", e);
            // In production, you might want to:
            // - Store in fallback buffer (Redis/memory)
            // - Emit metrics for monitoring
            // - Trigger alerts
        }
    });

    // IMMEDIATE RESPONSE: 202 Accepted
    // WHY: Client gets instant response, we handle processing async
    Ok((
        StatusCode::ACCEPTED,
        Json(IngestResponse {
            accepted: true,
            message: "Event accepted for processing".to_string(),
        }),
    ))
}

/// Health check endpoint
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

pub async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "ingestion-service".to_string(),
    })
}

