"use client";

import React from "react"

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEventById } from "@/lib/data";
import {
  Ticket,
  CreditCard,
  Lock,
  ArrowLeft,
  Check,
  Clock,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const quantity = parseInt(searchParams.get("quantity") || "1", 10);
  const seats = searchParams.get("seats")?.split(",") || [];
  const totalFromUrl = parseFloat(searchParams.get("total") || "0");

  const event = getEventById(eventId);

  const [step, setStep] = useState<"info" | "payment" | "success">("info");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
  });

  // Countdown timer
  useEffect(() => {
    if (step === "success") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/events");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    setStep("success");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

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

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your tickets have been confirmed and sent to {formData.email}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-left">
            <h2 className="font-semibold mb-4">{event.title}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {event.venue}, {event.city}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket className="h-4 w-4" />
                <span>
                  {seats.length > 0
                    ? `${seats.length} seat${seats.length > 1 ? "s" : ""}`
                    : `${quantity} ticket${quantity > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between font-semibold">
                <span>Total Paid</span>
                <span>${totalFromUrl.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/events" className="block">
              <Button className="w-full">Browse More Events</Button>
            </Link>
            <Button variant="outline" className="w-full bg-transparent">
              Download Tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-accent" />
            <span className="font-semibold tracking-tight">Tixly</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-accent" />
            <span
              className={cn(
                "font-mono",
                timeLeft < 120 && "text-destructive"
              )}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Warning Banner */}
        {timeLeft < 120 && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              Your session is expiring soon. Please complete your purchase.
            </p>
          </div>
        )}

        {/* Back Button */}
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Steps */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step === "info" || step === "payment"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  1
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:inline",
                    step === "info" ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Your Info
                </span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step === "payment"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  2
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:inline",
                    step === "payment"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Payment
                </span>
              </div>
            </div>

            {/* Step 1: Attendee Info */}
            {step === "info" && (
              <form onSubmit={handleInfoSubmit} className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Complete your attendee information
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    By entering your information, you acknowledge that you have
                    read our Privacy Policy.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                      >
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="bg-input border-border h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                      >
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="bg-input border-border h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="bg-input border-border h-11"
                      placeholder="your@email.com"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your tickets will be sent to this email address
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-sm font-medium tracking-wide">
                  Continue to Payment
                </Button>
              </form>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <h2 className="text-lg font-semibold">Payment Details</h2>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    Enter your card details to purchase an in-person ticket.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="cardNumber"
                        className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                      >
                        Card Number
                      </Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cardNumber: formatCardNumber(e.target.value),
                          })
                        }
                        className="bg-input border-border h-11 font-mono"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="expiry"
                          className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                        >
                          Expiry Date
                        </Label>
                        <Input
                          id="expiry"
                          value={formData.expiry}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expiry: formatExpiry(e.target.value),
                            })
                          }
                          className="bg-input border-border h-11 font-mono"
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="cvv"
                          className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                        >
                          CVV
                        </Label>
                        <Input
                          id="cvv"
                          type="password"
                          value={formData.cvv}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cvv: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="bg-input border-border h-11 font-mono"
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="nameOnCard"
                        className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                      >
                        Name on Card
                      </Label>
                      <Input
                        id="nameOnCard"
                        value={formData.nameOnCard}
                        onChange={(e) =>
                          setFormData({ ...formData, nameOnCard: e.target.value })
                        }
                        className="bg-input border-border h-11"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Your payment information is encrypted and secure</span>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("info")}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-sm font-medium tracking-wide"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      `PAY $${totalFromUrl.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-8">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.venue}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{event.time}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {seats.length > 0
                      ? `${seats.length} seat${seats.length > 1 ? "s" : ""}`
                      : `${quantity} ticket${quantity > 1 ? "s" : ""}`}
                  </span>
                  <span>${(totalFromUrl * 0.91).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>${(totalFromUrl * 0.09).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-border mt-4 pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${totalFromUrl.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
