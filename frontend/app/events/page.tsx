import { Suspense } from "react";
import { Header } from "@/components/header";
import { EventsFilter } from "@/components/events-filter";
import { EventsPageClient } from "./page-client";

export default function EventsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Discover Events
            </h1>
            <p className="text-muted-foreground">
              Find and book tickets for the best events near you
            </p>
          </div>

          {/* Filters */}
          <Suspense fallback={<div className="h-11 bg-card rounded-lg animate-pulse" />}>
            <EventsFilter />
          </Suspense>

          {/* Events Grid - Client Component */}
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg h-96 animate-pulse" />
              ))}
            </div>
          }>
            <EventsPageClient />
          </Suspense>
        </div>
      </main>
    </>
  );
}
