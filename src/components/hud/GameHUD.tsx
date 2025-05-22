// src/components/hud/GameHUD.tsx
"use client";

import type { ClientGameState } from '@/types';
import { PlayerVitals } from './PlayerVitals';
import { LocationDisplay } from './LocationDisplay';
import { NavigationIcons } from './NavigationIcons';
import { MinimapPlaceholder } from './MinimapPlaceholder';

interface GameHUDProps {
  gameState: ClientGameState;
  onOpenCharacterScreen: () => void; // Added
  onOpenQuestLogScreen: () => void;  // Added
}

export function GameHUD({ gameState, onOpenCharacterScreen, onOpenQuestLogScreen }: GameHUDProps) {
  const mcStats = gameState.seriesDetails?.mainCharacter?.stats;
  const magicPower = mcStats?.magicPower; // Already in CharacterStats

  return (
    <div className="fixed bottom-20 left-0 right-0 p-4 bg-black/50 text-white flex justify-between items-center z-40 rounded-lg mx-4">
      <div className="flex items-center space-x-4">
        {mcStats && <PlayerVitals stats={mcStats} magicPower={magicPower} />}
        {gameState.currentLocation && <LocationDisplay currentLocation={gameState.currentLocation} />}
      </div>
      <div className="flex items-center space-x-4">
        <NavigationIcons 
          onOpenCharacterScreen={onOpenCharacterScreen} 
          onOpenQuestLogScreen={onOpenQuestLogScreen} 
        />
        <MinimapPlaceholder />
      </div>
    </div>
  );
}
