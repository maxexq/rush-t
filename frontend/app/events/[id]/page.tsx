import { Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Music, Share2, Heart } from 'lucide-react';
import { EventDetailClient } from './page-client';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-background">
        {/* Hero Section */}
        <div className="relative h-[300px] md:h-[400px] bg-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="h-24 w-24 text-muted-foreground/20" />
          </div>

          {/* Back Button */}
          <div className="absolute top-4 left-4 z-20">
            <Link href="/events">
              <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Events
              </Button>
            </Link>
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur"
              aria-label="Share event"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur"
              aria-label="Save event"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - Client Component */}
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
              <div className="bg-card border border-border rounded-lg p-6 animate-pulse h-96" />
            </div>
          }
        >
          <EventDetailClient eventId={id} />
        </Suspense>

        {/* Spacer */}
        <div className="h-24" />
      </main>
    </>
  );
}
