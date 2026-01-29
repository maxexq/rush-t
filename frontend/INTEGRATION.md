# TicketRush Frontend Integration Guide

## Overview
Frontend refactored to connect with Go Core Service, Rust Flash Sale Service, and Redis for high-concurrency concert booking.

## Architecture

### Services
- **Core Service (Go):** `http://localhost:8080/api/v1` - Events, Users, Order History
- **Flash Sale Service (Rust):** `http://localhost:3000/api/v1` - Seat Locking (High Speed)
- **WebSocket:** `ws://localhost:8080/ws` - Real-time seat updates

### Tech Stack
- **State Management:** Zustand (booking cart)
- **Data Fetching:** TanStack Query (React Query)
- **HTTP Client:** Axios with interceptors
- **Real-time:** WebSocket hook

## File Structure

```
frontend/
├── lib/
│   ├── api.ts              # Axios instances (coreApi, flashSaleApi)
│   ├── types.ts            # TypeScript interfaces
│   └── providers.tsx       # QueryClientProvider wrapper
├── services/
│   ├── eventService.ts     # GET /events, /events/:id, /events/:id/seats
│   └── bookingService.ts   # POST /book (Rust, with idempotency key)
├── store/
│   └── booking.ts          # Zustand store for cart state
├── hooks/
│   ├── useWebSocket.ts     # WebSocket connection hook
│   ├── useSeatUpdates.ts   # Real-time seat update handler
│   └── use-toast.ts        # Toast notifications
├── app/
│   ├── layout.tsx          # Root with Providers + Toaster
│   ├── events/
│   │   ├── page.tsx        # Events list (server wrapper)
│   │   ├── page-client.tsx # Events list (client component)
│   │   └── [id]/
│   │       ├── page.tsx    # Event detail (server wrapper)
│   │       └── page-client.tsx  # Event detail (client component)
└── components/
    ├── seat-selector.tsx   # Real-time seat map with booking
    ├── ticket-selector.tsx # General admission tickets
    └── ui/
        ├── toast.tsx       # Toast component
        └── toaster.tsx     # Toast container
```

## Key Features Implemented

### 1. **API Integration**
- `lib/api.ts`: Configured Axios instances with auth token interceptors
- Automatic 401 handling (clear token, redirect to login)
- Error response normalization

### 2. **Event Data Fetching**
- `services/eventService.ts`:
  - `getEvents()` - List events with filters
  - `getEventById(id)` - Get single event
  - `getEventSeats(eventId)` - Fetch seat layout

### 3. **Booking Flow**
- `services/bookingService.ts`:
  - `createBooking()` - POST to Rust service with UUID idempotency key
  - Handles 409 Conflict (seat already taken)
- **Seat Selector:** Real-time seat map with status:
  - `available` - Green
  - `locked` - Orange + pulse animation
  - `sold` - Grey (disabled)
  - `my_selected` - Accent color

### 4. **Real-time Updates**
- `hooks/useWebSocket.ts`: WebSocket connection with auto-reconnect
- `hooks/useSeatUpdates.ts`: Listens to `seat_update` events and updates React Query cache
- Fallback polling every 5 seconds

### 5. **State Management**
- **Zustand Store** (`store/booking.ts`):
  - Selected seats
  - Cart timer
  - Max 10 seats per order
- **React Query**:
  - Server state caching
  - Automatic refetching
  - Optimistic updates

### 6. **Error Handling**
- **409 Conflict:** Toast - "Too slow! Seat just taken."
- **Network Errors:** Toast with retry option
- **Loading States:** Skeleton loaders for all async operations

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CORE_SERVICE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_FLASH_SALE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## API Contracts

### Events API (Go Core)

**GET /events**
Query params: `category`, `city`, `type`, `search`
Response:
```json
[{
  "id": "1",
  "title": "Taylor Swift - Eras Tour",
  "date": "2026-03-15",
  "time": "19:00",
  "venue": "Madison Square Garden",
  "city": "New York",
  "price": 150,
  "available_tickets": 245,
  "total_tickets": 20000,
  "type": "concert",
  "category": "Music"
}]
```

**GET /events/:id**
Response: Single event object

**GET /events/:id/seats**
Response:
```json
[{
  "id": "1-VIP-A-1",
  "event_id": "1",
  "section": "VIP",
  "row": "A",
  "number": 1,
  "price": 350,
  "status": "available" | "locked" | "sold"
}]
```

### Booking API (Rust Flash Sale)

**POST /book**
Headers: `X-Idempotency-Key: <uuid>`
Body:
```json
{
  "event_id": "1",
  "seat_ids": ["1-VIP-A-1", "1-VIP-A-2"]
}
```

Response (Success):
```json
{
  "booking_id": "abc123",
  "event_id": "1",
  "seats": [...],
  "total_price": 700,
  "status": "confirmed",
  "expires_at": "2026-01-30T12:15:00Z"
}
```

Response (409 Conflict):
```json
{
  "error": "Seat already taken",
  "seat_id": "1-VIP-A-1"
}
```

### WebSocket Events

**seat_update:**
```json
{
  "type": "seat_update",
  "data": {
    "event_id": "1",
    "seat_id": "1-VIP-A-1",
    "status": "locked",
    "locked_until": "2026-01-30T12:10:00Z"
  }
}
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000`

## Testing the Integration

1. **Events List:** `http://localhost:3000/events`
   - Should fetch from Go Core Service
   - Filter/search should work
   
2. **Event Detail:** Click any event
   - Should fetch event + seats
   - WebSocket should connect

3. **Seat Selection:**
   - Click seats to select (max 10)
   - Watch for real-time updates from other users
   - Click "CHECKOUT" to book

4. **Error Scenarios:**
   - Multiple users select same seat → 409 toast
   - Backend down → Network error toast
   - Seat locked by other user → Orange pulse animation

## Next Steps

- Implement authentication flow
- Add payment page
- Implement waiting room for high-demand events
- Add order history page
- Implement user profile

## Notes

- All components are client-side for interactivity
- Server components used as wrappers for SEO
- Auth token stored in localStorage
- WebSocket reconnects automatically on disconnect
- React Query cache updated in real-time via WebSocket

