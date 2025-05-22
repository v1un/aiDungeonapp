// src/components/hud/LocationDisplay.tsx
"use client";

import { MapPin } from 'lucide-react'; // Assuming lucide-react for icons

interface LocationDisplayProps {
  currentLocation: string;
}

export function LocationDisplay({ currentLocation }: LocationDisplayProps) {
  return (
    <div className="flex items-center">
      <MapPin className="h-5 w-5 mr-1 text-green-500" />
      <span>Location: {currentLocation}</span>
    </div>
  );
}
