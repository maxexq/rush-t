"use client";

import Link from "next/link";
import { Event } from "@/lib/types";
import { Calendar, MapPin, Clock, Users, Music } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const ticketPercentage = Math.round(
    (event.available_tickets / event.total_tickets) * 100
  );
  const isLowStock = ticketPercentage < 10;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="aspect-[16/10] relative overflow-hidden bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Music className="h-12 w-12 text-muted-foreground/30" />
        </div>
        {event.type === "concert" && (
          <Badge className="absolute top-3 left-3 z-20 bg-accent text-accent-foreground text-xs">
            CONCERT
          </Badge>
        )}
        {isLowStock && (
          <Badge className="absolute top-3 right-3 z-20 bg-destructive text-destructive-foreground text-xs">
            ALMOST SOLD OUT
          </Badge>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-foreground leading-tight group-hover:text-accent transition-colors line-clamp-2">
            {event.title}
          </h3>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formattedDate}</span>
            <Clock className="h-4 w-4 flex-shrink-0 ml-2" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span
              className={cn(
                "text-xs",
                isLowStock ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {event.available_tickets.toLocaleString()} left
            </span>
          </div>
          <div className="text-right">
            {event.original_price && (
              <span className="text-xs text-muted-foreground line-through mr-2">
                ${event.original_price}
              </span>
            )}
            <span className="font-semibold text-foreground">
              ${event.price}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
