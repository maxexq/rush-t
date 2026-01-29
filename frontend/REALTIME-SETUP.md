# Real-time Seat Updates - Implementation Guide

## Overview
Seat map updates **instantly** when other users lock, release, or book seats. No API polling.

## Architecture

### WebSocket Connection
**URL:** `ws://localhost:8080/ws/events/{eventId}`

### Message Format
```json
{
  "seat_id": "VIP-A-1",
  "status": "locked" | "sold" | "expired" | "available",
  "locked_by": "user123",
  "locked_until": "2026-01-30T12:15:00Z"
}
```

### Status Mapping
- `available` → Green (hover effect)
- `locked` → Orange + pulse animation (locked by someone else)
- `sold` → Red (disabled)
- `expired` → Green (released, mapped to `available`)

## Implementation

### 1. Hook: `useRealtimeSeats(eventId)`

**Location:** `frontend/hooks/useRealtimeSeats.ts`

**Features:**
- Connects to WebSocket on mount
- Auto-reconnect with exponential backoff (max 10s)
- Updates React Query cache directly (no re-fetch)
- Tracks recently updated seats for animation
- Connection state monitoring

**Returns:**
```ts
{
  connectionState: { status, attempts },
  reconnect: () => void,
  updatedSeats: Set<string>
}
```

### 2. Component: `SeatStatusBadge`

**Location:** `frontend/components/ui/seat-status-badge.tsx`

**Visual States:**
- **Available:** `bg-green-500/20` with hover scale
- **Locked:** `bg-orange-500/60` + `animate-pulse` + shadow
- **Sold:** `bg-red-500/30` (disabled)
- **Selected:** `bg-accent` + scale effect
- **Updating:** Ring animation when status changes

### 3. Integration in `SeatSelector`

**Changes:**
1. Replace `useSeatUpdates` with `useRealtimeSeats`
2. Disable polling (`refetchInterval: false`)
3. Add connection status indicator
4. Use `SeatStatusBadge` component
5. Pass `isUpdating` flag for animation

## Connection Lifecycle

### On Mount
```
1. Connect to ws://localhost:8080/ws/events/{eventId}
2. Listen for messages
3. Update cache on message
4. Trigger animation
```

### On Error / Close
```
1. Log disconnect
2. Schedule reconnect (exponential backoff)
3. Retry up to 10 seconds delay
```

### On Unmount
```
1. Set shouldReconnect = false
2. Close WebSocket
3. Clear timeouts
```

## Performance

### No Re-fetching
Updates apply **directly** to React Query cache:
```ts
queryClient.setQueryData(['seats', eventId], (oldSeats) => 
  oldSeats.map(seat => 
    seat.id === seat_id ? { ...seat, status } : seat
  )
);
```

### Animation Tracking
```ts
setUpdatedSeats(prev => new Set(prev).add(seat_id));
setTimeout(() => {
  setUpdatedSeats(prev => {
    const next = new Set(prev);
    next.delete(seat_id);
    return next;
  });
}, 1000);
```

## Visual Feedback Timeline

```
0ms:   Message arrives
0ms:   Cache updated
0ms:   Seat color changes + ring animation starts
500ms: Ping animation completes
1000ms: Ring animation removed
```

## Testing

### Simulate Updates
```bash
# In browser console
const ws = new WebSocket('ws://localhost:8080/ws/events/1');
ws.onopen = () => {
  ws.send(JSON.stringify({
    seat_id: "VIP-A-1",
    status: "locked"
  }));
};
```

### Expected Behavior
1. Seat VIP-A-1 turns orange
2. Pulse animation starts
3. Ring animation appears briefly
4. Status persists after animation

## Environment Variables

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## Troubleshooting

### Issue: Seats not updating
**Check:**
1. WebSocket connection status (top banner)
2. Browser console for errors
3. Backend WebSocket server running
4. Network tab for WS connection

### Issue: Animation not showing
**Check:**
1. `updatedSeats` Set contains seat ID
2. Tailwind animate classes loaded
3. `isUpdating` prop passed to SeatStatusBadge

### Issue: Multiple connections
**Check:**
1. React StrictMode (causes double mount in dev)
2. Component not remounting unnecessarily
3. Cleanup running on unmount

## Production Notes

- WebSocket reconnects automatically
- Exponential backoff prevents server hammering
- Connection state shown to user
- Manual reconnect button available
- All updates logged to console (remove in prod)

## Files Modified

1. `hooks/useRealtimeSeats.ts` - Core WebSocket hook
2. `components/ui/seat-status-badge.tsx` - Animated seat component
3. `components/seat-selector.tsx` - Integration + connection UI

## Key Advantages

✅ **Zero latency** - Instant updates  
✅ **No polling** - Efficient bandwidth usage  
✅ **Smooth animations** - Visual feedback  
✅ **Auto-recovery** - Reconnects on failure  
✅ **Status indicator** - User knows connection state  
✅ **Performance** - Direct cache updates

