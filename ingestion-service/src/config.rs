use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub server_host: String,
    pub server_port: u16,
    pub kafka_brokers: String,
    pub kafka_topic: String,
    pub kafka_timeout_ms: u64,
    pub max_concurrent_requests: usize,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            server_host: env::var("SERVER_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("SERVER_PORT must be a valid u16"),
            kafka_brokers: env::var("KAFKA_BROKERS")
                .unwrap_or_else(|_| "localhost:9092".to_string()),
            kafka_topic: env::var("KAFKA_TOPIC")
                .unwrap_or_else(|_| "ingestion.events".to_string()),
            kafka_timeout_ms: env::var("KAFKA_TIMEOUT_MS")
                .unwrap_or_else(|_| "1000".to_string())
                .parse()
                .expect("KAFKA_TIMEOUT_MS must be a valid u64"),
            max_concurrent_requests: env::var("MAX_CONCURRENT_REQUESTS")
                .unwrap_or_else(|_| "100000".to_string())
                .parse()
                .expect("MAX_CONCURRENT_REQUESTS must be a valid usize"),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".to_string()),
        }
    }

    pub fn server_addr(&self) -> String {
        format!("{}:{}", self.server_host, self.server_port)
    }
}

