# WebSocket Real-Time Updates

## Overview
Frontend clients connect to `/ws/events/:id` to receive real-time booking updates for a specific event.

## Endpoint
```
GET ws://localhost:3000/ws/events/{event_id}
```

## Message Format
Server broadcasts JSON messages:
```json
{
  "type": "reserved|expired|confirmed|cancelled",
  "data": {
    "event_id": 123,
    "seat_id": 456,
    "user_id": 789,
    "status": "reserved"
  }
}
```

## Frontend Example (JavaScript)

```javascript
// Connect to WebSocket for event_id = 1
const ws = new WebSocket('ws://localhost:3000/ws/events/1');

ws.onopen = () => {
  console.log('Connected to event updates');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  // Update seat map UI
  if (message.type === 'reserved') {
    updateSeatStatus(message.data.seat_id, 'reserved');
  } else if (message.type === 'expired') {
    updateSeatStatus(message.data.seat_id, 'available');
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected. Reconnecting...');
  // Implement reconnection logic
};
```

## React Hook Example

```typescript
import { useEffect, useState } from 'react';

function useEventUpdates(eventId: number) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws/events/${eventId}`);
    
    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Dispatch to state management (Redux/Zustand)
      handleSeatUpdate(message);
    };
    
    return () => ws.close();
  }, [eventId]);
  
  return status;
}
```

## Testing

### 1. Check Hub Stats
```bash
curl http://localhost:3000/ws/stats
# Returns: {"events":{1:5,2:3},"total_clients":8}
```

### 2. Test with wscat
```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/events/1
```

### 3. Produce Kafka Test Message
```bash
docker exec -it kafka kafka-console-producer --topic ticket_bookings --bootstrap-server localhost:9092

# Send:
{"event_id":1,"seat_id":10,"user_id":5,"status":"reserved"}
```

All connected clients for event_id=1 will receive the update immediately.

## Production Considerations
- Implement heartbeat/ping-pong
- Add authentication (JWT in query params or headers)
- Handle reconnection with exponential backoff
- Rate limit connections per IP
- Use sticky sessions for load balancing

