import { coreApi } from '@/lib/api';
import { Event, Seat } from '@/lib/types';

// Get all events with optional filters
export const getEvents = async (params?: {
  category?: string;
  city?: string;
  type?: string;
  search?: string;
}): Promise<Event[]> => {
  const { data } = await coreApi.get<Event[]>('/events', { params });
  return data;
};

// Get event by ID
export const getEventById = async (id: string): Promise<Event> => {
  const { data } = await coreApi.get<Event>(`/events/${id}`);
  return data;
};

// Get seats for an event
export const getEventSeats = async (eventId: string): Promise<Seat[]> => {
  const { data } = await coreApi.get<Seat[]>(`/events/${eventId}/seats`);
  return data;
};

