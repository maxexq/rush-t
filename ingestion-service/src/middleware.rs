use axum::{
    body::Body,
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tower::{Layer, Service};

/// Custom concurrency limit layer with load shedding
/// WHY: This is the CRITICAL layer that prevents the server from crashing
/// under extreme load (C100k problem).
///
/// HOW IT WORKS:
/// 1. Tracks active concurrent requests using atomic counter
/// 2. If limit exceeded, immediately returns 503 (fail fast)
/// 3. This prevents:
///    - Memory exhaustion from queued requests
///    - Thread pool saturation
///    - Cascading failures
#[derive(Clone)]
pub struct ConcurrencyLimitLayer {
    max_concurrent: usize,
}

impl ConcurrencyLimitLayer {
    pub fn new(max_concurrent: usize) -> Self {
        Self { max_concurrent }
    }
}

impl<S> Layer<S> for ConcurrencyLimitLayer {
    type Service = ConcurrencyLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        ConcurrencyLimitService {
            inner,
            max_concurrent: self.max_concurrent,
            current: Arc::new(AtomicUsize::new(0)),
        }
    }
}

#[derive(Clone)]
pub struct ConcurrencyLimitService<S> {
    inner: S,
    max_concurrent: usize,
    /// Atomic counter: Lock-free, extremely fast increment/decrement
    /// WHY AtomicUsize: No mutex overhead, critical for 100k+ RPS
    current: Arc<AtomicUsize>,
}

impl<S> Service<Request<Body>> for ConcurrencyLimitService<S>
where
    S: Service<Request<Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        // Fast path: Check if we're at capacity
        let current = self.current.load(Ordering::Relaxed);
        
        if current >= self.max_concurrent {
            // LOAD SHEDDING: Immediately reject request
            // WHY: Prevents server OOM and keeps existing requests healthy
            tracing::warn!(
                "Load shedding activated: {} >= {}",
                current,
                self.max_concurrent
            );
            
            let response = (
                StatusCode::SERVICE_UNAVAILABLE,
                "Server at capacity, try again later",
            )
                .into_response();
            
            return Box::pin(async move { Ok(response) });
        }

        // Increment counter (atomic operation)
        self.current.fetch_add(1, Ordering::Relaxed);
        
        let current_clone = self.current.clone();
        let mut inner = self.inner.clone();

        Box::pin(async move {
            // Call the actual service
            let response = inner.call(req).await;
            
            // Decrement counter when done (always executed)
            current_clone.fetch_sub(1, Ordering::Relaxed);
            
            response
        })
    }
}

