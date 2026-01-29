use tonic::{Request, Response, Status};
use crate::state::AppState;

pub mod inventory {
    tonic::include_proto!("inventory");
}

use inventory::{
    inventory_service_server::{InventoryService, InventoryServiceServer},
    SetQuotaRequest, SetQuotaResponse,
};

pub struct InventoryServiceImpl {
    state: AppState,
}

impl InventoryServiceImpl {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }
}

#[tonic::async_trait]
impl InventoryService for InventoryServiceImpl {
    async fn set_event_quota(
        &self,
        request: Request<SetQuotaRequest>,
    ) -> Result<Response<SetQuotaResponse>, Status> {
        let req = request.into_inner();
        
        tracing::info!(
            "gRPC SetEventQuota: event_id={}, quota={}",
            req.event_id,
            req.quota
        );

        let mut conn = self.state.redis_pool.get().await
            .map_err(|e| Status::internal(format!("Redis connection failed: {}", e)))?;

        // Set quota in Redis
        let key = format!("event:{}:quota", req.event_id);
        redis::cmd("SET")
            .arg(&key)
            .arg(req.quota)
            .query_async::<_, ()>(&mut conn)
            .await
            .map_err(|e| Status::internal(format!("Failed to set quota: {}", e)))?;

        tracing::info!("Successfully set quota for event {}", req.event_id);

        Ok(Response::new(SetQuotaResponse {
            success: true,
            message: format!("Quota {} set for event {}", req.quota, req.event_id),
        }))
    }
}

pub fn create_service(state: AppState) -> InventoryServiceServer<InventoryServiceImpl> {
    InventoryServiceServer::new(InventoryServiceImpl::new(state))
}

