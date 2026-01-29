use axum::{extract::State, http::StatusCode, Json};

use crate::errors::Result;
use crate::service::{attempt_booking, health_check, BookingRequest, BookingResponse, HealthResponse};
use crate::state::AppState;

/// POST /api/v1/book - Flash sale booking endpoint
pub async fn book_seat_handler(
    State(state): State<AppState>,
    Json(request): Json<BookingRequest>,
) -> Result<(StatusCode, Json<BookingResponse>)> {
    let response = attempt_booking(&state, request).await?;
    Ok((StatusCode::CREATED, Json(response)))
}

/// GET /health - Health check endpoint
pub async fn health_handler(
    State(state): State<AppState>,
) -> Result<Json<HealthResponse>> {
    let response = health_check(&state).await?;
    Ok(Json(response))
}

