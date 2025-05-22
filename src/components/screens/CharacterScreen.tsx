// src/components/screens/CharacterScreen.tsx
"use client";

import type { ClientGameState, CharacterStats } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Swords,
  Brain,
  Zap,
  Clover,
  Star,
  HelpCircle // Fallback icon
} from 'lucide-react';
import React from 'react';

interface CharacterScreenProps {
  gameState: ClientGameState;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get icon for a stat
const getStatIcon = (statName: keyof CharacterStats | string) => {
  switch (statName.toLowerCase()) {
    case 'strength':
      return Shield;
    case 'dexterity':
      return Swords;
    case 'intelligence':
      return Brain;
    case 'magicpower': // Ensure consistent casing with stats object keys
    case 'magicPower':
      return Zap;
    case 'luck':
      return Clover;
    case 'specialability': // Ensure consistent casing
    case 'specialAbility':
      return Star;
    default:
      return HelpCircle;
  }
};

const StatDisplay: React.FC<{
  statName: string;
  statValue: string | number | undefined;
  IconComponent: React.ElementType;
}> = ({ statName, statValue, IconComponent }) => {
  const isNumeric = typeof statValue === 'number' || (typeof statValue === 'string' && !isNaN(parseFloat(statValue)) && isFinite(Number(statValue)));
  const displayValue = statValue === undefined || statValue === null || String(statValue).trim() === "" ? "N/A" : String(statValue);

  const numericValue = isNumeric ? parseInt(String(statValue), 10) : 0;
  const progressWidth = isNumeric ? Math.min(numericValue * 10, 100) : 0; // Assuming stats are generally 0-10 scale

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg my-2 shadow-sm">
      <div className="flex-none w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <IconComponent className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-grow">
        <div className="text-sm font-medium text-muted-foreground mb-0.5">{statName}</div>
        {isNumeric && displayValue !== "N/A" ? (
          <div className="h-2.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressWidth}%` }}
            ></div>
          </div>
        ) : (
          <div className="text-base text-foreground">{displayValue}</div>
        )}
      </div>
      {isNumeric && displayValue !== "N/A" && (
        <div className="flex-none font-mono text-lg text-foreground">{displayValue}</div>
      )}
    </div>
  );
};


export function CharacterScreen({ gameState, isOpen, onClose }: CharacterScreenProps) {
  if (!isOpen) {
    return null;
  }

  const mc = gameState.seriesDetails?.mainCharacter;

  if (!mc) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-background border border-border rounded-lg shadow-xl p-6 w-full max-w-2xl text-center">
          <p className="text-xl text-muted-foreground mb-4">Character information not available.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const { name, description, stats } = mc;

  // Order of stats to display
  const statOrder: (keyof CharacterStats)[] = ['strength', 'dexterity', 'intelligence', 'magicPower', 'luck', 'specialAbility'];
  const statDisplayNames: Record<keyof CharacterStats, string> = {
    strength: "Strength",
    dexterity: "Dexterity",
    intelligence: "Intelligence",
    magicPower: "Magic Power",
    luck: "Luck",
    specialAbility: "Special Ability"
  };


  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-background border border-border rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto styled-scrollbar">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{name}</h2>
            {description && <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:bg-muted/50">Close</Button>
        </div>

        <div className="space-y-3">
          {stats ? statOrder.map((statKey) => {
            const statValue = stats[statKey];
            // Handle cases where stat might be missing from the stats object
            if (statValue === undefined && statKey !== 'specialAbility' && statKey !== 'magicPower' && statKey !== 'luck') {
                 // For core stats, if undefined, treat as 0 or N/A
                 return (
                    <StatDisplay
                        key={statKey}
                        statName={statDisplayNames[statKey]}
                        statValue={"N/A"}
                        IconComponent={getStatIcon(statKey)}
                    />
                 );
            }
            // Only render if statValue is present or it's an optional stat that can be "N/A"
            if (statValue !== undefined || ['specialAbility', 'magicPower', 'luck'].includes(statKey)) {
              return (
                <StatDisplay
                  key={statKey}
                  statName={statDisplayNames[statKey]}
                  statValue={statValue}
                  IconComponent={getStatIcon(statKey)}
                />
              );
            }
            return null; // Don't render if core stat is missing and not handled above
          }) : (
            <p className="text-center text-muted-foreground py-4">No character stats available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
