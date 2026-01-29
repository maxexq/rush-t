"use client";

import React from "react"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, ArrowRight, User, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate authentication
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/events");
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    // Simulate guest session creation
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/events");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2">
            <Ticket className="h-8 w-8 text-accent" />
            <span className="text-2xl font-semibold tracking-tight">Tixly</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-balance">
              Your gateway to
              <br />
              unforgettable
              <br />
              experiences
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Book tickets for the hottest concerts, conferences, and events.
              Secure your spot today.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Concerts</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>Conferences</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>Festivals</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-background">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Logo */}
          <Link
            href="/"
            className="lg:hidden flex items-center gap-2 mb-12 justify-center"
          >
            <Ticket className="h-8 w-8 text-accent" />
            <span className="text-2xl font-semibold tracking-tight">Tixly</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSignUp
                ? "Enter your details to get started"
                : "Enter your credentials to access your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="pl-10 bg-input border-border h-12"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10 bg-input border-border h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-10 pr-10 bg-input border-border h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-medium tracking-wide"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium tracking-wide bg-transparent"
            onClick={handleGuestLogin}
            disabled={loading}
          >
            <User className="mr-2 h-4 w-4" />
            CONTINUE AS GUEST
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
