use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use std::sync::Arc;
use std::time::Duration;

use crate::config::Config;
use crate::errors::Result;

#[derive(Clone)]
pub struct AppState {
    /// Singleton Kafka producer shared across all requests
    /// WHY Arc: Zero-cost sharing across threads (Kafka producer is thread-safe)
    /// WHY FutureProducer: Async, non-blocking sends critical for high throughput
    pub kafka_producer: Arc<FutureProducer>,
    pub config: Config,
}

impl AppState {
    pub fn new(config: Config) -> Result<Self> {
        // Kafka producer optimized for HIGH THROUGHPUT
        let kafka_producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &config.kafka_brokers)
            // CRITICAL SETTINGS FOR 100K+ LOAD:
            
            // Timeout: Fail fast if broker is slow (prevents blocking)
            .set("message.timeout.ms", config.kafka_timeout_ms.to_string())
            
            // Queue size: Buffer messages in memory if broker is temporarily slow
            // WHY: Prevents immediate failures during broker hiccups
            .set("queue.buffering.max.messages", "500000")
            .set("queue.buffering.max.kbytes", "2097152") // 2GB buffer
            
            // Batching: Send messages in batches for efficiency
            // WHY: Reduces syscalls and network overhead dramatically
            .set("batch.num.messages", "10000")
            .set("linger.ms", "5") // Wait 5ms to batch messages
            
            // Compression: Reduce network bandwidth
            .set("compression.type", "lz4")
            
            // Acknowledgment: Only wait for leader (not all replicas)
            // WHY: Faster response, acceptable for ingestion use case
            .set("acks", "1")
            
            // Disable idempotence for max speed (tradeoff: possible duplicates)
            .set("enable.idempotence", "false")
            
            // Increase max in-flight requests (default is 5)
            // WHY: Allows producer to send more messages concurrently
            .set("max.in.flight.requests.per.connection", "100")
            
            .create()
            .map_err(|e| crate::errors::AppError::Kafka(e))?;

        Ok(Self {
            kafka_producer: Arc::new(kafka_producer),
            config,
        })
    }

    /// Async, fire-and-forget Kafka send
    /// WHY: Non-blocking is critical - we return 202 immediately to client
    /// If Kafka is slow, we let the internal queue handle it
    pub async fn send_event(&self, key: &str, payload: &str) -> Result<()> {
        let record = FutureRecord::to(&self.config.kafka_topic)
            .key(key)
            .payload(payload);

        // Send with timeout - if it fails, we let it fail fast
        // WHY: In extreme load, we prefer to drop some messages rather than crash
        let timeout = Duration::from_millis(self.config.kafka_timeout_ms);
        
        self.kafka_producer
            .send(record, timeout)
            .await
            .map_err(|(e, _)| crate::errors::AppError::Kafka(e))?;

        Ok(())
    }
}

