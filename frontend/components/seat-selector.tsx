'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SeatStatusBadge } from '@/components/ui/seat-status-badge';
import { getEventSeats } from '@/services/eventService';
import { createBooking } from '@/services/bookingService';
import { Seat, ApiError } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ShoppingCart, X, ZoomIn, ZoomOut, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSeats } from '@/hooks/useRealtimeSeats';

interface SeatSelectorProps {
  eventId: string;
}

export function SeatSelector({ eventId }: SeatSelectorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Fetch seats data (initial load only, no polling)
  const { data: seats = [], isLoading } = useQuery({
    queryKey: ['seats', eventId],
    queryFn: () => getEventSeats(eventId),
    refetchInterval: false, // Rely on WebSocket for updates
  });

  // Real-time WebSocket updates
  const { connectionState, reconnect, updatedSeats } = useRealtimeSeats(eventId);

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      toast({
        title: 'Booking Confirmed!',
        description: `Successfully booked ${selectedSeats.length} seats.`,
      });
      router.push(`/payment?bookingId=${data.booking_id}&total=${data.total_price}`);
    },
    onError: (error: ApiError) => {
      if (error.status === 409) {
        toast({
          variant: 'destructive',
          title: 'Too slow!',
          description: 'Seat just taken. Please select another.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: error.message || 'Please try again.',
        });
      }
      // Clear selections and refetch
      setSelectedSeats([]);
    },
  });

  const sections = ['VIP', 'A', 'B', 'C', 'D'];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const sectionColors: Record<string, string> = {
    VIP: 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30',
    A: 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30',
    B: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30',
    C: 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30',
    D: 'bg-slate-500/20 border-slate-500/50 hover:bg-slate-500/30',
  };

  const sectionBgColors: Record<string, string> = {
    VIP: 'bg-amber-500',
    A: 'bg-rose-500',
    B: 'bg-blue-500',
    C: 'bg-emerald-500',
    D: 'bg-slate-500',
  };

  const getSeatsBySection = (section: string) =>
    seats.filter((s) => s.section === section);

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'locked') return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 10) {
        toast({
          title: 'Maximum Reached',
          description: 'Maximum 10 seats per order.',
        });
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const removeSeat = (seat: Seat) => {
    setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const serviceFee = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + serviceFee;

  const handleCheckout = () => {
    if (selectedSeats.length === 0) return;

    bookingMutation.mutate({
      event_id: eventId,
      seat_ids: selectedSeats.map((s) => s.id),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2">
          {connectionState.status === 'connected' ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500 font-medium">Live Updates Active</span>
            </>
          ) : connectionState.status === 'connecting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <span className="text-xs text-orange-500">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-500">Disconnected</span>
            </>
          )}
        </div>
        {connectionState.status !== 'connected' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reconnect}
            className="h-7 text-xs"
          >
            Reconnect
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50" />
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent" />
          <span className="text-xs text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500/60 animate-pulse" />
          <span className="text-xs text-muted-foreground">Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/30" />
          <span className="text-xs text-muted-foreground">Sold</span>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          disabled={zoom <= 0.5}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground flex items-center px-2">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent"
          onClick={() => setZoom(Math.min(1.5, zoom + 0.25))}
          disabled={zoom >= 1.5}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Stage */}
      <div className="flex justify-center">
        <div className="w-3/4 h-12 bg-secondary rounded-b-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground tracking-widest uppercase">
            Stage
          </span>
        </div>
      </div>

      {/* Seating Chart */}
      <div
        className="overflow-auto pb-4"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        <div className="space-y-4 min-w-[600px]">
          {sections.map((section) => {
            const sectionSeats = getSeatsBySection(section);
            const isActive = activeSection === section;

            return (
              <div key={section} className="space-y-2">
                {/* Section Header */}
                <button
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-lg border transition-colors',
                    sectionColors[section],
                    isActive && 'ring-2 ring-accent'
                  )}
                  onClick={() => setActiveSection(isActive ? null : section)}
                  aria-expanded={isActive}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          sectionBgColors[section]
                        )}
                      />
                      <span className="font-medium">
                        {section === 'VIP' ? 'VIP Section' : `Section ${section}`}
                      </span>
                    </div>
                    <span className="text-sm">
                      $
                      {section === 'VIP'
                        ? '350'
                        : section === 'A'
                          ? '200'
                          : section === 'B'
                            ? '150'
                            : section === 'C'
                              ? '120'
                              : '80'}
                    </span>
                  </div>
                </button>

                {/* Seats Grid */}
                {isActive && (
                  <div className="bg-card/50 border border-border rounded-lg p-4 space-y-2">
                    {rows.map((row) => {
                      const rowSeats = sectionSeats.filter((s) => s.row === row);
                      return (
                        <div key={row} className="flex items-center gap-2">
                          <span className="w-6 text-xs text-muted-foreground font-medium">
                            {row}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {rowSeats.map((seat) => {
                              const isSelected = selectedSeats.some(
                                (s) => s.id === seat.id
                              );
                              const isUpdating = updatedSeats.has(seat.id);

                              return (
                                <SeatStatusBadge
                                  key={seat.id}
                                  seat={seat}
                                  isSelected={isSelected}
                                  isUpdating={isUpdating}
                                  onClick={() => toggleSeat(seat)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Selected Seats ({selectedSeats.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSeats([])}
              className="text-xs text-muted-foreground"
            >
              Clear all
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSeats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm"
              >
                <span>
                  {seat.section}-{seat.row}
                  {seat.number}
                </span>
                <button
                  onClick={() => removeSeat(seat)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove seat ${seat.section}-${seat.row}${seat.number}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full h-11 text-sm font-medium tracking-wide"
            onClick={handleCheckout}
            disabled={bookingMutation.isPending}
          >
            {bookingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                PROCESSING...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                CHECKOUT
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

