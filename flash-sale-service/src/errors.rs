use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Redis error: {0}")]
    Redis(#[from] deadpool_redis::PoolError),

    #[error("Redis pool creation error: {0}")]
    RedisPoolCreate(String),

    #[error("Redis command error: {0}")]
    RedisCmd(#[from] redis::RedisError),

    #[error("Kafka error: {0}")]
    Kafka(#[from] rdkafka::error::KafkaError),

    #[error("Seat already taken")]
    SeatTaken,

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Internal server error")]
    InternalError,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::SeatTaken => (StatusCode::CONFLICT, "Seat already reserved"),
            AppError::BadRequest(ref msg) => (StatusCode::BAD_REQUEST, msg.as_str()),
            AppError::Redis(_) | AppError::RedisPoolCreate(_) | AppError::RedisCmd(_) | AppError::Kafka(_) => {
                tracing::error!("Internal error: {}", self);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AppError::InternalError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

