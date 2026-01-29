// API Response Types

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
  type: 'concert' | 'general';
  price: number;
  original_price?: number;
  available_tickets: number;
  total_tickets: number;
  artists?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Seat {
  id: string;
  event_id: string;
  section: string;
  row: string;
  number: number;
  price: number;
  status: 'available' | 'locked' | 'sold' | 'my_selected';
  locked_by?: string;
  locked_until?: string;
}

export interface BookingRequest {
  event_id: string;
  seat_ids: string[];
  user_id?: string;
}

export interface BookingResponse {
  booking_id: string;
  event_id: string;
  seats: Seat[];
  total_price: number;
  status: 'pending' | 'confirmed' | 'failed';
  expires_at: string;
}

export interface WebSocketMessage {
  type: 'seat_update' | 'booking_status' | 'error';
  data: SeatUpdate | BookingStatusUpdate | ErrorMessage;
}

export interface SeatUpdate {
  event_id: string;
  seat_id: string;
  status: Seat['status'];
  locked_by?: string;
  locked_until?: string;
}

export interface BookingStatusUpdate {
  booking_id: string;
  status: BookingResponse['status'];
}

export interface ErrorMessage {
  code: string;
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

