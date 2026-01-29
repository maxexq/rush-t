'use client';

import { Seat } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SeatStatusBadgeProps {
  seat: Seat;
  isSelected: boolean;
  isUpdating?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function SeatStatusBadge({
  seat,
  isSelected,
  isUpdating,
  onClick,
  disabled,
}: SeatStatusBadgeProps) {
  const isSold = seat.status === 'sold';
  const isLocked = seat.status === 'locked';
  const isAvailable = seat.status === 'available';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isSold || isLocked}
      className={cn(
        'w-7 h-7 rounded text-xs font-medium transition-all duration-300',
        // Base states
        isAvailable &&
          !isSelected &&
          'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-200 hover:scale-110',
        isSelected && 'bg-accent text-accent-foreground shadow-lg scale-105',
        isLocked &&
          'bg-orange-500/60 text-orange-100 cursor-not-allowed animate-pulse shadow-orange-500/30 shadow-md',
        isSold &&
          'bg-red-500/30 text-red-300 cursor-not-allowed border border-red-500/40',
        // Animation on update
        isUpdating &&
          'animate-[ping_0.5s_ease-in-out] ring-2 ring-accent ring-offset-2'
      )}
      title={`Row ${seat.row}, Seat ${seat.number} - $${seat.price} - ${seat.status}`}
      aria-label={`Row ${seat.row}, Seat ${seat.number}, ${seat.status}, $${seat.price}`}
    >
      {seat.number}
    </button>
  );
}

