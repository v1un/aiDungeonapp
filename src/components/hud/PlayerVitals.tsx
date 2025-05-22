// src/components/hud/PlayerVitals.tsx
"use client";

import type { CharacterStats } from '@/types';
import { Heart, Zap, Shield, Brain } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlayerVitalsProps {
  stats: CharacterStats;
  magicPower?: string;
}

export function PlayerVitals({ stats, magicPower }: PlayerVitalsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center bg-red-950/50 px-2 py-1 rounded-md border border-red-800/50">
              <Heart className="h-4 w-4 mr-1.5 text-red-400" />
              <span className="text-sm font-medium">{stats.strength}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Strength: {stats.strength}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-800/50">
              <Shield className="h-4 w-4 mr-1.5 text-emerald-400" />
              <span className="text-sm font-medium">{stats.dexterity}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Dexterity: {stats.dexterity}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center bg-violet-950/50 px-2 py-1 rounded-md border border-violet-800/50">
              <Brain className="h-4 w-4 mr-1.5 text-violet-400" />
              <span className="text-sm font-medium">{stats.intelligence}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Intelligence: {stats.intelligence}</p>
          </TooltipContent>
        </Tooltip>
        
        {magicPower && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center bg-blue-950/50 px-2 py-1 rounded-md border border-blue-800/50">
                <Zap className="h-4 w-4 mr-1.5 text-blue-400" />
                <span className="text-sm font-medium">{magicPower}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Magic Power: {magicPower}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {stats.specialAbility && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-amber-950/50 px-2 py-1 rounded-md border border-amber-800/50 text-amber-200 text-xs">
                Special Ability
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{stats.specialAbility}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
