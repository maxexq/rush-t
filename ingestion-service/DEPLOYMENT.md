# Production Deployment Guide

## Prerequisites

### Hardware Requirements
- **CPU:** 8+ cores (16 recommended)
- **RAM:** 8GB minimum (16GB recommended)
- **Network:** 10Gbps NIC (for 100k concurrent)
- **Storage:** 50GB (for logs and binary)

### OS Tuning (Linux)

1. **Install sysctl config:**
```bash
sudo cp deployment/sysctl-tuning.conf /etc/sysctl.d/99-ingestion-service.conf
sudo sysctl -p /etc/sysctl.d/99-ingestion-service.conf
```

2. **Set ulimits in `/etc/security/limits.conf`:**
```
ingestion soft nofile 1000000
ingestion hard nofile 1000000
ingestion soft nproc 64000
ingestion hard nproc 64000
```

3. **Reboot or re-login** for limits to take effect.

## Build Release Binary

```bash
# On build machine
cargo build --release

# Binary location
ls -lh target/release/ingestion-service
# Should be ~15-20MB (stripped)
```

## Deployment Steps

### Option 1: Systemd Service (Recommended)

1. **Create service user:**
```bash
sudo useradd -r -s /bin/false -U ingestion
```

2. **Setup directories:**
```bash
sudo mkdir -p /opt/ingestion-service/bin
sudo mkdir -p /etc/ingestion-service
sudo mkdir -p /var/log/ingestion-service

sudo chown -R ingestion:ingestion /opt/ingestion-service
sudo chown -R ingestion:ingestion /var/log/ingestion-service
```

3. **Copy binary:**
```bash
sudo cp target/release/ingestion-service /opt/ingestion-service/bin/
sudo chmod +x /opt/ingestion-service/bin/ingestion-service
```

4. **Create config file `/etc/ingestion-service/config.env`:**
```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
KAFKA_TOPIC=ingestion.events
KAFKA_TIMEOUT_MS=1000
MAX_CONCURRENT_REQUESTS=100000
RUST_LOG=ingestion_service=info
```

5. **Install systemd service:**
```bash
sudo cp deployment/ingestion-service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ingestion-service
sudo systemctl start ingestion-service
```

6. **Check status:**
```bash
sudo systemctl status ingestion-service
sudo journalctl -u ingestion-service -f
```

### Option 2: Docker/Kubernetes

**Docker:**
```bash
docker build -t ingestion-service:1.0.0 .
docker run -d \
  --name ingestion-service \
  --ulimit nofile=1000000:1000000 \
  -p 8080:8080 \
  --env-file .env \
  ingestion-service:1.0.0
```

**Kubernetes (example deployment):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingestion-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ingestion-service
  template:
    metadata:
      labels:
        app: ingestion-service
    spec:
      containers:
      - name: ingestion-service
        image: ingestion-service:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: MAX_CONCURRENT_REQUESTS
          value: "100000"
        - name: KAFKA_BROKERS
          value: "kafka:9092"
        resources:
          requests:
            cpu: "4"
            memory: "4Gi"
          limits:
            cpu: "8"
            memory: "8Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ingestion-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: ingestion-service
```

## Load Balancer Configuration

### HAProxy Example
```
frontend ingestion_front
    bind *:80
    mode http
    default_backend ingestion_back

backend ingestion_back
    mode http
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    
    server node1 10.0.1.10:8080 check inter 2s rise 2 fall 3 maxconn 100000
    server node2 10.0.1.11:8080 check inter 2s rise 2 fall 3 maxconn 100000
    server node3 10.0.1.12:8080 check inter 2s rise 2 fall 3 maxconn 100000
```

### NGINX Example
```nginx
upstream ingestion_backend {
    least_conn;
    server 10.0.1.10:8080 max_conns=100000;
    server 10.0.1.11:8080 max_conns=100000;
    server 10.0.1.12:8080 max_conns=100000;
}

server {
    listen 80;
    
    location /health {
        proxy_pass http://ingestion_backend;
        proxy_connect_timeout 1s;
    }
    
    location /api/v1/ingest {
        proxy_pass http://ingestion_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # Prevent buffering
        proxy_buffering off;
    }
}
```

## Monitoring

### Prometheus Metrics Endpoint
Add to `Cargo.toml`:
```toml
metrics = "0.21"
metrics-exporter-prometheus = "0.13"
```

Expose metrics on `/metrics` endpoint for scraping.

### Key Alerts

**High Load Shedding Rate:**
```yaml
- alert: HighLoadSheddingRate
  expr: rate(http_responses{status="503"}[5m]) > 100
  annotations:
    summary: "Service is rejecting requests (load shedding active)"
```

**High Latency:**
```yaml
- alert: HighLatency
  expr: http_request_duration_seconds{quantile="0.99"} > 0.1
  annotations:
    summary: "P99 latency > 100ms"
```

**Near Capacity:**
```yaml
- alert: NearCapacity
  expr: active_requests / max_concurrent_requests > 0.9
  annotations:
    summary: "Service at 90% capacity - consider scaling"
```

## Performance Validation

### Pre-Production Load Test

```bash
# Warm-up
wrk -t8 -c1000 -d30s \
  -s tests/test-load.lua http://localhost:8080/api/v1/ingest

# Full load test
wrk -t16 -c100000 -d120s --latency \
  -s tests/test-load.lua http://localhost:8080/api/v1/ingest

# Expected results:
# - RPS: 50,000+
# - P99 latency: < 50ms
# - 503 rate: 0% (if under capacity)
# - No crashes or OOM
```

### Chaos Testing

```bash
# Test 1: Kill Kafka broker mid-load
# Expected: 503 responses temporarily, then recovery

# Test 2: Send 200k concurrent requests
# Expected: 100k accepted, 100k rejected (503), no crash

# Test 3: Slow client simulation
# Expected: Timeouts kick in, connections freed
```

## Troubleshooting

### High CPU Usage
```bash
# Check if worker_threads needs tuning
# Default: 16, adjust in main.rs based on cores
```

### Memory Growth
```bash
# Check Kafka queue depth
# May need to increase broker capacity or reduce MAX_CONCURRENT_REQUESTS
```

### Connection Refused
```bash
# Check file descriptor limits
ulimit -n
# Should show 1000000

# Check listening sockets
ss -tlnp | grep 8080
```

### 503 Errors
```bash
# Check current load
curl http://localhost:8080/health

# Check logs
journalctl -u ingestion-service -n 100 --no-pager | grep "Load shedding"

# If sustained, scale horizontally
```

## Scaling Guidelines

| Expected Load | Instances | Total Capacity |
|---------------|-----------|----------------|
| 50k concurrent | 1 | 100k |
| 150k concurrent | 2 | 200k |
| 500k concurrent | 5 | 500k |
| 1M concurrent | 10 | 1M |

**Remember:** Each instance can handle 100k concurrent. Add 50% headroom for spikes.

## Rollback Plan

```bash
# Stop new version
sudo systemctl stop ingestion-service

# Restore previous binary
sudo cp /opt/ingestion-service/bin/ingestion-service.backup \
       /opt/ingestion-service/bin/ingestion-service

# Start old version
sudo systemctl start ingestion-service

# Verify
curl http://localhost:8080/health
```

## Security

1. **Network isolation:** Service should only be accessible via load balancer
2. **JWT validation:** Enable if needed (code included in handlers)
3. **Rate limiting:** Consider adding per-IP rate limits at LB level
4. **DDoS protection:** Use CloudFlare or AWS Shield
5. **Secrets management:** Use Vault or AWS Secrets Manager for JWT_SECRET

## Cost Optimization

- **Auto-scaling:** Scale down during off-peak hours
- **Spot instances:** Use for non-critical environments
- **Right-sizing:** Monitor actual usage and adjust resources
- **Kafka optimization:** Tune retention policies to reduce storage costs

