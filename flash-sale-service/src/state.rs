use deadpool_redis::{Config as RedisConfig, Pool as RedisPool, Runtime};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use std::sync::Arc;
use std::time::Duration;

use crate::config::Config;
use crate::errors::Result;

#[derive(Clone)]
pub struct AppState {
    pub redis_pool: RedisPool,
    pub kafka_producer: Arc<FutureProducer>,
    pub config: Config,
}

impl AppState {
    pub fn new(config: Config) -> Result<Self> {
        // Redis connection pool
        let redis_cfg = RedisConfig::from_url(config.redis_url.clone());
        let redis_pool = redis_cfg
            .create_pool(Some(Runtime::Tokio1))
            .map_err(|e| crate::errors::AppError::Redis(e))?;

        // Kafka producer
        let kafka_producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &config.kafka_brokers)
            .set("message.timeout.ms", "5000")
            .set("queue.buffering.max.messages", "100000")
            .set("queue.buffering.max.kbytes", "1048576")
            .set("batch.num.messages", "10000")
            .set("linger.ms", "10")
            .set("compression.type", "lz4")
            .set("acks", "1")
            .create()
            .map_err(|e| crate::errors::AppError::Kafka(e))?;

        Ok(Self {
            redis_pool,
            kafka_producer: Arc::new(kafka_producer),
            config,
        })
    }

    pub async fn publish_event(&self, key: &str, payload: &str) -> Result<()> {
        let record = FutureRecord::to(&self.config.kafka_topic)
            .key(key)
            .payload(payload);

        self.kafka_producer
            .send(record, Duration::from_secs(5))
            .await
            .map_err(|(e, _)| crate::errors::AppError::Kafka(e))?;

        Ok(())
    }
}

