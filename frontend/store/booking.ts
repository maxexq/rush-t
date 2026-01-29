import { create } from 'zustand';
import { Seat } from '@/lib/types';

interface BookingStore {
  selectedSeats: Seat[];
  eventId: string | null;
  expiresAt: Date | null;
  
  // Actions
  setEventId: (eventId: string) => void;
  addSeat: (seat: Seat) => void;
  removeSeat: (seatId: string) => void;
  clearSeats: () => void;
  setExpiresAt: (date: Date) => void;
  
  // Computed
  totalPrice: () => number;
  seatCount: () => number;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  selectedSeats: [],
  eventId: null,
  expiresAt: null,
  
  setEventId: (eventId) => set({ eventId }),
  
  addSeat: (seat) =>
    set((state) => {
      // Prevent duplicates
      if (state.selectedSeats.some((s) => s.id === seat.id)) {
        return state;
      }
      // Max 10 seats
      if (state.selectedSeats.length >= 10) {
        return state;
      }
      return { selectedSeats: [...state.selectedSeats, seat] };
    }),
  
  removeSeat: (seatId) =>
    set((state) => ({
      selectedSeats: state.selectedSeats.filter((s) => s.id !== seatId),
    })),
  
  clearSeats: () => set({ selectedSeats: [], expiresAt: null }),
  
  setExpiresAt: (date) => set({ expiresAt: date }),
  
  totalPrice: () => {
    const { selectedSeats } = get();
    return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  },
  
  seatCount: () => get().selectedSeats.length,
}));

