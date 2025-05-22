// src/components/hud/LocationDisplay.tsx
"use client";

import { Compass } from 'lucide-react';

interface LocationDisplayProps {
  currentLocation: string;
}

export function LocationDisplay({ currentLocation }: LocationDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-stone-800/80 rounded-md px-2.5 py-1.5 border border-amber-800/40">
        <Compass className="h-4 w-4 mr-2 text-amber-400" />
        <div className="flex flex-col">
          <span className="text-xs opacity-70">Current Location</span>
          <span className="text-sm font-medium text-amber-100">{currentLocation}</span>
        </div>
      </div>
    </div>
  );
}
