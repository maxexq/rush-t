import Link from "next/link";
import { Header } from "@/components/header";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Ticket, Shield, Zap, Clock } from "lucide-react";

// Mock featured events for homepage - in production, fetch from API
const mockFeaturedEvents = [
  {
    id: "1",
    title: "Taylor Swift - Eras Tour",
    description: "Experience the magic of Taylor Swift's record-breaking Eras Tour.",
    date: "2026-03-15",
    time: "19:00",
    venue: "Madison Square Garden",
    city: "New York",
    price: 150,
    original_price: 200,
    category: "Music",
    type: "concert" as const,
    available_tickets: 245,
    total_tickets: 20000,
    artists: ["Taylor Swift"],
  },
  {
    id: "2",
    title: "Tech Conference 2026",
    description: "Join thousands of developers for the biggest tech conference.",
    date: "2026-04-20",
    time: "09:00",
    venue: "Moscone Center",
    city: "San Francisco",
    price: 350,
    category: "Conference",
    type: "general" as const,
    available_tickets: 1200,
    total_tickets: 5000,
  },
  {
    id: "3",
    title: "Coldplay - Music of the Spheres",
    description: "Coldplay brings their spectacular tour.",
    date: "2026-05-10",
    time: "20:00",
    venue: "Wembley Stadium",
    city: "London",
    price: 120,
    original_price: 150,
    category: "Music",
    type: "concert" as const,
    available_tickets: 890,
    total_tickets: 90000,
    artists: ["Coldplay"],
  },
];

export default function HomePage() {
  const featuredEvents = mockFeaturedEvents;
  const upcomingConcerts = mockFeaturedEvents.filter((e) => e.type === "concert");

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.03),transparent_50%)]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-6">
                <Ticket className="h-8 w-8 text-accent" />
                <span className="text-sm font-medium tracking-widest uppercase text-accent">
                  TicketRush
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
                Your gateway to
                <br />
                unforgettable
                <br />
                experiences
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                Discover and book tickets for the hottest concerts, conferences,
                festivals, and events worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/events">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8">
                    GET TICKETS
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/events?type=concert">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 bg-transparent"
                  >
                    BROWSE CONCERTS
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="border-y border-border bg-card/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <p className="text-3xl font-bold text-accent">500K+</p>
                  <p className="text-sm text-muted-foreground">
                    Tickets sold monthly
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent">10K+</p>
                  <p className="text-sm text-muted-foreground">
                    Events available
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent">150+</p>
                  <p className="text-sm text-muted-foreground">
                    Cities worldwide
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent">99.9%</p>
                  <p className="text-sm text-muted-foreground">
                    Customer satisfaction
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Events */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Featured Events
                </h2>
                <p className="text-muted-foreground mt-1">
                  Don't miss these popular experiences
                </p>
              </div>
              <Link href="/events" className="hidden sm:block">
                <Button variant="ghost">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/events">
                <Button variant="outline" className="w-full bg-transparent">
                  View all events
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Concerts Section */}
        <section className="py-16 lg:py-24 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Live Concerts
                </h2>
                <p className="text-muted-foreground mt-1">
                  Choose your seats and experience the magic
                </p>
              </div>
              <Link href="/events?type=concert" className="hidden sm:block">
                <Button variant="ghost">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingConcerts.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/events?type=concert">
                <Button variant="outline" className="w-full bg-transparent">
                  View all concerts
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                Why Choose Tixly
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We make buying event tickets simple, secure, and stress-free
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Secure Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment and personal data are protected with
                  industry-leading encryption
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Instant Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Get your tickets delivered to your email immediately after
                  purchase
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Fair Queue System</h3>
                <p className="text-sm text-muted-foreground">
                  Our waiting room ensures everyone gets a fair chance during
                  high-demand sales
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Ready to experience something amazing?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Browse thousands of events and secure your tickets today. No
              account required to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/events">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8">
                  EXPLORE EVENTS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-transparent"
                >
                  CREATE ACCOUNT
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ticket className="h-5 w-5 text-accent" />
                  <span className="font-semibold">TicketRush</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  High-speed concert booking platform.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-4 text-sm">Events</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/events" className="hover:text-foreground">
                      All Events
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/events?type=concert"
                      className="hover:text-foreground"
                    >
                      Concerts
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/events?category=Conference"
                      className="hover:text-foreground"
                    >
                      Conferences
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/events?category=Sports"
                      className="hover:text-foreground"
                    >
                      Sports
                    </Link>
                  </li>
                </ul>
              </div>
            <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p>2026 TicketRush. All rights reserved.</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Refund Policy
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-4 text-sm">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-foreground">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p>2026 TicketRush. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
