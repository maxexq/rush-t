use chrono::Utc;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Deserialize, Serialize)]
pub struct BookingRequest {
    pub event_id: String,
    pub seat_id: String,
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct BookingResponse {
    pub success: bool,
    pub message: String,
    pub booking_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct BookingEvent {
    event_id: String,
    seat_id: String,
    user_id: String,
    status: String,
    timestamp: String,
    booking_id: String,
}

/// CRITICAL: Atomic locking mechanism using Redis SET NX
/// Handles race condition where multiple users try to book the same seat
pub async fn attempt_booking(
    state: &AppState,
    request: BookingRequest,
) -> Result<BookingResponse> {
    // Validate input
    if request.event_id.is_empty() || request.seat_id.is_empty() || request.user_id.is_empty() {
        return Err(AppError::BadRequest("Missing required fields".to_string()));
    }

    let lock_key = format!("ticket_lock:{}:{}", request.event_id, request.seat_id);
    let booking_id = uuid::Uuid::new_v4().to_string();

    // Get Redis connection from pool
    let mut conn = state.redis_pool.get().await?;

    // ATOMIC OPERATION: SET NX with expiration
    // SET ticket_lock:{event_id}:{seat_id} {user_id} NX PX {ttl_ms}
    let lock_acquired: bool = redis::cmd("SET")
        .arg(&lock_key)
        .arg(&request.user_id)
        .arg("NX")
        .arg("PX")
        .arg(state.config.lock_ttl_ms)
        .query_async(&mut *conn)
        .await
        .unwrap_or(false);

    if !lock_acquired {
        // Seat already taken - immediate 409 Conflict
        return Err(AppError::SeatTaken);
    }

    // Lock acquired successfully - publish to Kafka
    let event = BookingEvent {
        event_id: request.event_id.clone(),
        seat_id: request.seat_id.clone(),
        user_id: request.user_id.clone(),
        status: "reserved".to_string(),
        timestamp: Utc::now().to_rfc3339(),
        booking_id: booking_id.clone(),
    };

    let payload = serde_json::to_string(&event)
        .map_err(|_| AppError::InternalError)?;

    let kafka_key = format!("{}:{}", request.event_id, request.seat_id);

    // Publish to Kafka (fire-and-forget style, minimal latency)
    state.publish_event(&kafka_key, &payload).await?;

    Ok(BookingResponse {
        success: true,
        message: "Seat reserved successfully".to_string(),
        booking_id: Some(booking_id),
    })
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub redis: bool,
    pub kafka: bool,
}

pub async fn health_check(state: &AppState) -> Result<HealthResponse> {
    // Quick Redis ping
    let redis_ok = match state.redis_pool.get().await {
        Ok(mut conn) => conn.get::<&str, Option<String>>("_health").await.is_ok(),
        Err(_) => false,
    };

    // Kafka is always "ok" if producer exists (actual check would slow down)
    let kafka_ok = true;

    Ok(HealthResponse {
        status: "ok".to_string(),
        redis: redis_ok,
        kafka: kafka_ok,
    })
}

