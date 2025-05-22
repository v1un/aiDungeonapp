// src/components/hud/PlayerVitals.tsx
"use client";

import type { CharacterStats } from '@/types';
import { Heart, Zap } from 'lucide-react'; // Assuming lucide-react for icons

interface PlayerVitalsProps {
  stats: CharacterStats;
  magicPower?: string; // Already in CharacterStats, but passed separately in GameHUD example
}

export function PlayerVitals({ stats, magicPower }: PlayerVitalsProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center">
        <Heart className="h-5 w-5 mr-1 text-red-500" />
        <span>Health: {stats.strength}</span>
      </div>
      {magicPower && (
        <div className="flex items-center">
          <Zap className="h-5 w-5 mr-1 text-blue-500" />
          <span>Magic: {magicPower}</span>
        </div>
      )}
    </div>
  );
}
