'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Seat } from '@/lib/types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

interface SeatUpdateMessage {
  seat_id: string;
  status: 'available' | 'locked' | 'sold' | 'expired';
  locked_by?: string;
  locked_until?: string;
}

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  attempts: number;
}

export const useRealtimeSeats = (eventId: string) => {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const shouldReconnect = useRef(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connecting',
    attempts: 0,
  });

  // Track recently updated seats for animation
  const [updatedSeats, setUpdatedSeats] = useState<Set<string>>(new Set());

  const handleSeatUpdate = useCallback(
    (message: SeatUpdateMessage) => {
      const { seat_id, status } = message;

      // Map "expired" to "available" for our UI
      const finalStatus = status === 'expired' ? 'available' : status;

      // Update React Query cache immediately - NO re-fetch
      queryClient.setQueryData<Seat[]>(['seats', eventId], (oldSeats) => {
        if (!oldSeats) return oldSeats;

        return oldSeats.map((seat) =>
          seat.id === seat_id
            ? {
                ...seat,
                status: finalStatus,
                locked_by: message.locked_by,
                locked_until: message.locked_until,
              }
            : seat
        );
      });

      // Track for animation
      setUpdatedSeats((prev) => new Set(prev).add(seat_id));
      setTimeout(() => {
        setUpdatedSeats((prev) => {
          const next = new Set(prev);
          next.delete(seat_id);
          return next;
        });
      }, 1000); // Animation duration

      // Log for debugging
      console.log(
        `[Realtime] Seat ${seat_id} → ${status}${status === 'expired' ? ' (released)' : ''}`
      );
    },
    [eventId, queryClient]
  );

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE_URL}/events/${eventId}`;
    console.log(`[Realtime] Connecting to ${url}`);

    setConnectionState((prev) => ({
      status: 'connecting',
      attempts: prev.attempts + 1,
    }));

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[Realtime] Connected');
        setConnectionState({ status: 'connected', attempts: 0 });
      };

      ws.current.onmessage = (event) => {
        try {
          const message: SeatUpdateMessage = JSON.parse(event.data);
          handleSeatUpdate(message);
        } catch (error) {
          console.error('[Realtime] Failed to parse message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        setConnectionState((prev) => ({ ...prev, status: 'error' }));
      };

      ws.current.onclose = (event) => {
        console.log(
          `[Realtime] Disconnected (code: ${event.code}, reason: ${event.reason})`
        );
        setConnectionState((prev) => ({ ...prev, status: 'disconnected' }));

        // Auto-reconnect with exponential backoff
        if (shouldReconnect.current) {
          const delay = Math.min(
            1000 * Math.pow(2, connectionState.attempts),
            10000
          );
          console.log(`[Realtime] Reconnecting in ${delay}ms...`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[Realtime] Failed to create WebSocket:', error);
      setConnectionState((prev) => ({ ...prev, status: 'error' }));
    }
  }, [eventId, connectionState.attempts, handleSeatUpdate]);

  // Connect on mount
  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Cleaning up connection');
      shouldReconnect.current = false;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    connect();
  }, [connect]);

  return {
    connectionState,
    reconnect,
    updatedSeats,
  };
};

