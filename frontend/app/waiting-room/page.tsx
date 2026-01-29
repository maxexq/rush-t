"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ticket, Users, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getEventById } from "@/lib/data";
import { cn } from "@/lib/utils";

function WaitingRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const quantity = searchParams.get("quantity") || "1";
  const seats = searchParams.get("seats") || "";
  const returnTo = searchParams.get("returnTo") || "/payment";

  const event = getEventById(eventId);

  const [queuePosition, setQueuePosition] = useState(
    Math.floor(Math.random() * 1000) + 500
  );
  const [estimatedWait, setEstimatedWait] = useState(
    Math.floor(queuePosition / 50)
  );
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"waiting" | "ready" | "expired">(
    "waiting"
  );

  // Simulate queue progression
  useEffect(() => {
    if (status !== "waiting") return;

    const interval = setInterval(() => {
      setQueuePosition((prev) => {
        const newPosition = Math.max(0, prev - Math.floor(Math.random() * 50));
        if (newPosition === 0) {
          setStatus("ready");
          clearInterval(interval);
        }
        return newPosition;
      });

      setProgress((prev) => Math.min(100, prev + Math.random() * 5));
      setEstimatedWait((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Auto-redirect when ready
  useEffect(() => {
    if (status === "ready") {
      const timer = setTimeout(() => {
        const total =
          seats.length > 0
            ? seats.split(",").length * 150
            : parseInt(quantity, 10) * 100;
        router.push(
          `${returnTo}?eventId=${eventId}&quantity=${quantity}${seats ? `&seats=${seats}` : ""}&total=${total}`
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router, eventId, quantity, seats, returnTo]);

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Event not found</p>
          <Link href="/events">
            <Button variant="outline">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-accent" />
            <span className="font-semibold tracking-tight">Tixly</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Animated Icon */}
          <div className="relative">
            <div
              className={cn(
                "w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors",
                status === "ready"
                  ? "bg-accent/20"
                  : status === "expired"
                    ? "bg-destructive/20"
                    : "bg-secondary"
              )}
            >
              {status === "waiting" && (
                <RefreshCw className="h-10 w-10 text-muted-foreground animate-spin" />
              )}
              {status === "ready" && (
                <Ticket className="h-10 w-10 text-accent" />
              )}
              {status === "expired" && (
                <AlertCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            {status === "waiting" && (
              <div className="absolute inset-0 rounded-full border-4 border-accent/30 animate-ping" />
            )}
          </div>

          {/* Status Message */}
          {status === "waiting" && (
            <>
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  You're in the waiting room
                </h1>
                <p className="text-muted-foreground">
                  High demand for this event. Please wait while we secure your
                  spot.
                </p>
              </div>

              {/* Queue Info */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    <span className="text-foreground font-semibold">
                      {queuePosition.toLocaleString()}
                    </span>{" "}
                    people ahead of you
                  </span>
                </div>

                <Progress value={progress} className="h-2" />

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Estimated wait:{" "}
                    <span className="text-foreground font-semibold">
                      ~{estimatedWait} minutes
                    </span>
                  </span>
                </div>
              </div>

              {/* Event Info */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{event.title}</p>
                <p>
                  {new Date(event.date).toLocaleDateString()} at {event.time}
                </p>
              </div>

              {/* Tips */}
              <div className="bg-secondary/50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-medium">While you wait:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Keep this tab open and active</li>
                  <li>• Don't refresh the page</li>
                  <li>• Have your payment ready</li>
                  <li>• You'll be redirected automatically</li>
                </ul>
              </div>
            </>
          )}

          {status === "ready" && (
            <div>
              <h1 className="text-2xl font-bold mb-2 text-accent">
                It's your turn!
              </h1>
              <p className="text-muted-foreground">
                Redirecting you to checkout...
              </p>
            </div>
          )}

          {status === "expired" && (
            <>
              <div>
                <h1 className="text-2xl font-bold mb-2">Session Expired</h1>
                <p className="text-muted-foreground">
                  Your waiting room session has expired. Please try again.
                </p>
              </div>
              <Link href={`/events/${eventId}`}>
                <Button>Return to Event</Button>
              </Link>
            </>
          )}

          {/* Leave Queue */}
          {status === "waiting" && (
            <Link
              href={`/events/${eventId}`}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Leave queue and return to event
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          <p>
            Tickets are allocated on a first-come, first-served basis. Your
            place in line is secured.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function WaitingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <WaitingRoomContent />
    </Suspense>
  );
}
