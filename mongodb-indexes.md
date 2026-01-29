# MongoDB Indexes - Audit Logs Collection

## Collection: `audit_logs`

### Indexes

```javascript
// 1. Time-series queries (most common)
db.audit_logs.createIndex(
  { "timestamp": -1 },
  { name: "idx_timestamp_desc" }
)

// 2. Event-specific audit trail with time range
db.audit_logs.createIndex(
  { "event_id": 1, "timestamp": -1 },
  { name: "idx_event_time" }
)

// 3. User activity tracking
db.audit_logs.createIndex(
  { "user_id": 1, "timestamp": -1 },
  { name: "idx_user_time" }
)

// 4. Action-based filtering (e.g., all payment failures)
db.audit_logs.createIndex(
  { "action": 1, "status": 1, "timestamp": -1 },
  { name: "idx_action_status_time" }
)

// 5. Transaction lookup (unique)
db.audit_logs.createIndex(
  { "transaction_id": 1 },
  { name: "idx_transaction_unique", unique: true }
)

// 6. Booking reference lookup
db.audit_logs.createIndex(
  { "booking_ref": 1, "timestamp": -1 },
  { name: "idx_booking_time" }
)

// 7. Service performance monitoring
db.audit_logs.createIndex(
  { "service": 1, "action": 1, "timestamp": -1 },
  { name: "idx_service_action_time" }
)

// 8. High-latency detection
db.audit_logs.createIndex(
  { "latency_ms": -1, "timestamp": -1 },
  { name: "idx_latency_time", 
    partialFilterExpression: { "latency_ms": { $gt: 1000 } } }
)
```

## Time-Series Collection (MongoDB 5.0+)

**Recommended:** Use MongoDB Time-Series Collection for better compression and query performance.

```javascript
db.createCollection("audit_logs", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata_ts",
    granularity: "seconds"
  },
  expireAfterSeconds: 7776000  // 90 days retention
})

// metadata_ts structure for optimized queries
{
  "metadata_ts": {
    "event_id": 789,
    "user_id": 12345,
    "action": "attempt_lock",
    "service": "rust-axum"
  }
}
```

## Example Queries

### Query logs for specific event in time range
```javascript
db.audit_logs.find({
  "event_id": 789,
  "timestamp": {
    $gte: ISODate("2026-01-30T10:00:00Z"),
    $lt: ISODate("2026-01-30T18:00:00Z")
  }
}).sort({ "timestamp": -1 })
```

### Find failed payments with high latency
```javascript
db.audit_logs.find({
  "action": "payment_attempt",
  "status": "failed",
  "latency_ms": { $gt: 5000 }
}).sort({ "timestamp": -1 }).limit(100)
```

### User's complete booking journey
```javascript
db.audit_logs.find({
  "booking_ref": "BK-ABC123"
}).sort({ "timestamp": 1 })
```

## Aggregation Pipeline Examples

### Event-level metrics
```javascript
db.audit_logs.aggregate([
  { $match: { 
      "event_id": 789,
      "timestamp": { $gte: ISODate("2026-01-30T00:00:00Z") }
  }},
  { $group: {
      _id: "$action",
      count: { $sum: 1 },
      avg_latency: { $avg: "$latency_ms" },
      success_rate: {
        $avg: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
      }
  }},
  { $sort: { count: -1 } }
])
```

### Service health monitoring
```javascript
db.audit_logs.aggregate([
  { $match: { 
      "timestamp": { $gte: ISODate("2026-01-30T14:00:00Z") }
  }},
  { $bucket: {
      groupBy: "$latency_ms",
      boundaries: [0, 50, 100, 500, 1000, 5000, 10000],
      default: "Timeout",
      output: {
        count: { $sum: 1 },
        actions: { $push: "$action" }
      }
  }}
])
```

