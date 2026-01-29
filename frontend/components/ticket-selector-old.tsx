"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Event } from "@/lib/data";
import { Minus, Plus, ShoppingCart, AlertCircle } from "lucide-react";

interface TicketSelectorProps {
  event: Event;
}

export function TicketSelector({ event }: TicketSelectorProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const maxTickets = Math.min(10, event.availableTickets);
  const subtotal = event.price * quantity;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => {
    if (quantity < maxTickets) setQuantity(quantity + 1);
  };

  const handleCheckout = () => {
    // Simulate potential queue - 20% chance to go to waiting room
    const shouldQueue = Math.random() < 0.2;
    if (shouldQueue) {
      router.push(
        `/waiting-room?eventId=${event.id}&quantity=${quantity}&returnTo=/payment`
      );
    } else {
      router.push(
        `/payment?eventId=${event.id}&quantity=${quantity}&total=${total}`
      );
    }
  };

  const isLowStock = event.availableTickets < 100;

  return (
    <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
      <h3 className="font-semibold text-lg mb-4">Select Tickets</h3>

      {/* Price Display */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold">${event.price}</span>
        {event.originalPrice && (
          <span className="text-muted-foreground line-through">
            ${event.originalPrice}
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
            Only {event.availableTickets} tickets left!
          </p>
        </div>
      )}

      {/* Order Summary */}
      <div className="space-y-2 py-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({quantity} {quantity === 1 ? "ticket" : "tickets"})
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
        disabled={event.availableTickets === 0}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {event.availableTickets === 0 ? "SOLD OUT" : "CHECKOUT"}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Tickets are non-refundable. Review our terms before purchase.
      </p>
    </div>
  );
}
