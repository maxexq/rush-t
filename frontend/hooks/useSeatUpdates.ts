import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { WebSocketMessage, Seat } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

export const useSeatUpdates = (eventId: string) => {
  const queryClient = useQueryClient();

  const handleMessage = (message: WebSocketMessage) => {
    if (message.type === 'seat_update') {
      const update = message.data as { event_id: string; seat_id: string; status: Seat['status'] };
      
      // Only process updates for current event
      if (update.event_id !== eventId) return;

      // Update React Query cache
      queryClient.setQueryData<Seat[]>(['seats', eventId], (oldSeats) => {
        if (!oldSeats) return oldSeats;
        
        return oldSeats.map((seat) =>
          seat.id === update.seat_id
            ? { ...seat, status: update.status }
            : seat
        );
      });
    }
  };

  useWebSocket({
    url: `${WS_URL}?eventId=${eventId}`,
    onMessage: handleMessage,
    reconnect: true,
  });
};

