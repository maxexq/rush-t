'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Event, ApiError } from '@/lib/types';
import { Minus, Plus, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { createBooking } from '@/services/bookingService';
import { useToast } from '@/hooks/use-toast';

interface TicketSelectorProps {
  event: Event;
}

export function TicketSelector({ event }: TicketSelectorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const maxTickets = Math.min(10, event.available_tickets);
  const subtotal = event.price * quantity;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      toast({
        title: 'Booking Confirmed!',
        description: `Successfully booked ${quantity} tickets.`,
      });
      router.push(`/payment?bookingId=${data.booking_id}&total=${data.total_price}`);
    },
    onError: (error: ApiError) => {
      if (error.status === 409) {
        toast({
          variant: 'destructive',
          title: 'Too slow!',
          description: 'Tickets just taken. Please try again.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: error.message || 'Please try again.',
        });
      }
    },
  });

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => {
    if (quantity < maxTickets) setQuantity(quantity + 1);
  };

  const handleCheckout = () => {
    // For general admission, we need to create a booking without specific seat IDs
    // This assumes the backend handles general admission differently
    bookingMutation.mutate({
      event_id: event.id,
      seat_ids: [], // Empty for general admission
    });
  };

  const isLowStock = event.available_tickets < 100;

  return (
    <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
      <h3 className="font-semibold text-lg mb-4">Select Tickets</h3>

      {/* Price Display */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold">${event.price}</span>
        {event.original_price && (
          <span className="text-muted-foreground line-through">
            ${event.original_price}
          </span>
        )}
        <span className="text-muted-foreground text-sm">per ticket</span>
      </div>

      {/* Ticket Type */}
      <div className="p-4 bg-secondary rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">General Admission</span>
          <span className="text-muted-foreground">${event.price}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Access to the main event area
        </p>
      </div>

      {/* Quantity Selector */}
      <div className="mb-6">
        <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground block mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xl font-semibold w-8 text-center">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={increaseQuantity}
            disabled={quantity >= maxTickets}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Maximum {maxTickets} tickets per order
        </p>
      </div>

      {/* Low Stock Warning */}
      {isLowStock && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Only {event.available_tickets} tickets left!
          </p>
        </div>
      )}

      {/* Order Summary */}
      <div className="space-y-2 py-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({quantity} {quantity === 1 ? 'ticket' : 'tickets'})
          </span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Service fee</span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-2 border-t border-border">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        className="w-full h-12 text-sm font-medium tracking-wide mt-4"
        onClick={handleCheckout}
        disabled={event.available_tickets === 0 || bookingMutation.isPending}
      >
        {bookingMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            PROCESSING...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {event.available_tickets === 0 ? 'SOLD OUT' : 'CHECKOUT'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Tickets are non-refundable. Review our terms before purchase.
      </p>
    </div>
  );
}

