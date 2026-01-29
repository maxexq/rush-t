"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { categories, cities } from "@/lib/data";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function EventsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const currentCategory = searchParams.get("category") || "All";
  const currentCity = searchParams.get("city") || "All Cities";
  const currentType = searchParams.get("type") || "all";
  const currentSearch = searchParams.get("search") || "";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (
      value === "All" ||
      value === "All Cities" ||
      value === "all" ||
      value === ""
    ) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/events?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/events");
  };

  const hasActiveFilters =
    currentCategory !== "All" ||
    currentCity !== "All Cities" ||
    currentType !== "all" ||
    currentSearch !== "";

  return (
    <div className="space-y-4">
      {/* Search and Toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, venues..."
            value={currentSearch}
            onChange={(e) => updateFilters("search", e.target.value)}
            className="pl-10 bg-input border-border h-11"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-11 w-11 flex-shrink-0", showFilters && "bg-accent text-accent-foreground")}
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-card border border-border rounded-lg">
          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              Category
            </label>
            <Select
              value={currentCategory}
              onValueChange={(v) => updateFilters("category", v)}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              City
            </label>
            <Select
              value={currentCity}
              onValueChange={(v) => updateFilters("city", v)}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              Event Type
            </label>
            <Select
              value={currentType}
              onValueChange={(v) => updateFilters("type", v)}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="concert">Concerts Only</SelectItem>
                <SelectItem value="general">General Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Active filters:
          </span>
          {currentCategory !== "All" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => updateFilters("category", "All")}
            >
              {currentCategory}
              <X className="h-3 w-3" />
            </Button>
          )}
          {currentCity !== "All Cities" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => updateFilters("city", "All Cities")}
            >
              {currentCity}
              <X className="h-3 w-3" />
            </Button>
          )}
          {currentType !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => updateFilters("type", "all")}
            >
              {currentType === "concert" ? "Concerts" : "General"}
              <X className="h-3 w-3" />
            </Button>
          )}
          {currentSearch && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => updateFilters("search", "")}
            >
              "{currentSearch}"
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
