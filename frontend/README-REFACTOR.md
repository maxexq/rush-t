# Frontend Refactor Summary

## Completed

### Infrastructure
- ✅ Axios instances with auth interceptors (`lib/api.ts`)
- ✅ TanStack Query provider (`lib/providers.tsx`)
- ✅ Zustand store for booking cart (`store/booking.ts`)
- ✅ TypeScript types (`lib/types.ts`)

### Services
- ✅ Event service: `getEvents()`, `getEventById()`, `getEventSeats()` (`services/eventService.ts`)
- ✅ Booking service: `createBooking()` with idempotency key (`services/bookingService.ts`)

### Real-time
- ✅ WebSocket hook with auto-reconnect (`hooks/useWebSocket.ts`)
- ✅ Seat updates hook (`hooks/useSeatUpdates.ts`)

### Components
- ✅ Refactored SeatSelector with real API + WebSocket
- ✅ Refactored TicketSelector with booking mutation
- ✅ Updated EventCard to use new types
- ✅ Toast notifications for errors

### Pages
- ✅ Events list with React Query
- ✅ Event detail with React Query
- ✅ Homepage with mock data (static)

### Error Handling
- ✅ 409 Conflict → "Too slow! Seat just taken."
- ✅ Network errors → Toast notifications
- ✅ Loading states → Skeleton loaders

### Real-time Seat Status Visuals
- ✅ `available` → Green with hover
- ✅ `locked` → Orange with pulse animation
- ✅ `sold` → Grey (disabled)
- ✅ `my_selected` → Accent color

## Environment Setup

`.env.local`:
```env
NEXT_PUBLIC_CORE_SERVICE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_FLASH_SALE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## Usage

```bash
npm install
npm run dev
```

## API Integration Points

1. **Events List:** `GET /events` → Go Core Service
2. **Event Detail:** `GET /events/:id` → Go Core Service
3. **Seat Layout:** `GET /events/:id/seats` → Go Core Service
4. **Booking:** `POST /book` → Rust Flash Sale Service (with `X-Idempotency-Key`)
5. **Real-time:** WebSocket `ws://localhost:8080/ws?eventId={id}`

## Key Files

- `lib/api.ts` - Axios config
- `services/eventService.ts` - Event API calls
- `services/bookingService.ts` - Booking API calls
- `store/booking.ts` - Cart state
- `hooks/useSeatUpdates.ts` - Real-time updates
- `components/seat-selector.tsx` - Seat map with booking
- `components/ticket-selector.tsx` - General admission

See `INTEGRATION.md` for full documentation.

