'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { EventCard } from '@/components/event-card';
import { getEvents } from '@/services/eventService';
import { Event } from '@/lib/types';

const ITEMS_PER_PAGE = 6;

export function EventsPageClient() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'All';
  const city = searchParams.get('city') || 'All Cities';
  const type = searchParams.get('type') || 'all';
  const search = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', category, city, type, search],
    queryFn: () => getEvents({
      category: category === 'All' ? undefined : category,
      city: city === 'All Cities' ? undefined : city,
      type: type === 'all' ? undefined : type,
      search: search || undefined,
    }),
  });

  // Client-side pagination
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg h-96 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-lg">
        <p className="text-destructive mb-2">Failed to load events</p>
        <p className="text-sm text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  if (paginatedEvents.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-lg">
        <p className="text-muted-foreground mb-2">No events found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="text-foreground font-medium">
            {paginatedEvents.length}
          </span>{' '}
          of{' '}
          <span className="text-foreground font-medium">
            {events.length}
          </span>{' '}
          events
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </>
  );
}

