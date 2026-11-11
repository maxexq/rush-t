'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { TicketSelector } from '@/components/ticket-selector';
import { SeatSelector } from '@/components/seat-selector';
import { getEventById } from '@/services/eventService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Heart,
  Music,
  Info,
  Ticket,
} from 'lucide-react';

interface EventDetailClientProps {
  eventId: string;
}

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse h-96" />
      </div>
    );
  }

  if (error || !event) {
    notFound();
  }

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const ticketPercentage = Math.round(
    (event.available_tickets / event.total_tickets) * 100
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">{event.category}</Badge>
              {event.type === 'concert' && (
                <Badge className="bg-accent text-accent-foreground">
                  CONCERT
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-balance">
              {event.title}
            </h1>

            {event.artists && event.artists.length > 0 && (
              <p className="text-muted-foreground mb-4">
                Featuring: {event.artists.join(', ')}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{event.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">
                    {typeof event.venue === 'string' ? event.venue : event.venue.name}, {event.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="font-medium">
                    {event.available_tickets?.toLocaleString()} tickets left (
                    {ticketPercentage}%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-lg">About This Event</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Seat Selection for Concerts */}
          {event.type === 'concert' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="h-5 w-5 text-accent" />
                <h2 className="font-semibold text-lg">Select Your Seats</h2>
              </div>
              <SeatSelector eventId={event.id} />
            </div>
          )}

          {/* Venue Info */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-lg">Venue Information</h2>
            </div>
            <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center mb-4">
              <span className="text-muted-foreground text-sm">Map View</span>
            </div>
            <h3 className="font-medium mb-1">
              {typeof event.venue === 'string' ? event.venue : event.venue.name}
            </h3>
            <p className="text-muted-foreground text-sm">
              {typeof event.venue === 'object' && event.venue.address ? event.venue.address + ', ' : ''}{event.city}
            </p>
          </div>
        </div>

        {/* Sidebar - Ticket Selection */}
        <div className="lg:col-span-1">
          {event.type === 'general' && <TicketSelector event={event} />}
          {event.type === 'concert' && (
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Ticket Pricing</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span>VIP Section</span>
                  <span className="font-semibold">$350</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span>Section A</span>
                  <span className="font-semibold">$200</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span>Section B</span>
                  <span className="font-semibold">$150</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span>Section C</span>
                  <span className="font-semibold">$120</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span>Section D</span>
                  <span className="font-semibold">$80</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Select seats from the seat map above to add to cart
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

