import { flashSaleApi } from '@/lib/api';
import { BookingRequest, BookingResponse } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Create booking with idempotency key
export const createBooking = async (
  request: BookingRequest
): Promise<BookingResponse> => {
  const idempotencyKey = uuidv4();
  
  const { data } = await flashSaleApi.post<BookingResponse>('/book', request, {
    headers: {
      'X-Idempotency-Key': idempotencyKey,
    },
  });
  
  return data;
};

// Lock seats temporarily (optional, if your backend supports it)
export const lockSeats = async (
  eventId: string,
  seatIds: string[]
): Promise<{ success: boolean; expires_at: string }> => {
  const { data } = await flashSaleApi.post('/seats/lock', {
    event_id: eventId,
    seat_ids: seatIds,
  });
  
  return data;
};

// Release locked seats
export const releaseSeats = async (
  eventId: string,
  seatIds: string[]
): Promise<void> => {
  await flashSaleApi.post('/seats/release', {
    event_id: eventId,
    seat_ids: seatIds,
  });
};

