// src/components/hud/GameHUD.tsx
"use client";

import type { ClientGameState } from '@/types';
import { PlayerVitals } from './PlayerVitals';
import { LocationDisplay } from './LocationDisplay';
import { NavigationIcons } from './NavigationIcons';
import { MinimapPlaceholder } from './MinimapPlaceholder';
import { InventoryQuickAccess } from './InventoryQuickAccess';
import { ActiveQuestTracker } from './ActiveQuestTracker';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface GameHUDProps {
  gameState: ClientGameState;
  onOpenCharacterScreen: () => void;
  onOpenQuestLogScreen: () => void;
  isCollapsed: boolean; // Added prop
  onToggleCollapse: () => void; // Added prop
}

export function GameHUD({ 
  gameState, 
  onOpenCharacterScreen, 
  onOpenQuestLogScreen,
  isCollapsed, // Use prop
  onToggleCollapse // Use prop
}: GameHUDProps) {
  const mcStats = gameState.seriesDetails?.mainCharacter?.stats;
  const magicPower = mcStats?.magicPower;
  
  // Get the first active quest if available
  const currentQuest = gameState.activeQuests?.find(q => q.status === 'active');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out"
         style={{ transform: isCollapsed ? 'translateY(calc(100% - 40px))' : 'translateY(0)' }}>
      {/* Collapse toggle bar */}
      <div 
        className="flex justify-center mx-auto w-32 h-8 bg-stone-800 border-t border-x border-amber-700/70 
                   rounded-t-lg cursor-pointer relative -top-2"
        onClick={onToggleCollapse} // Use prop callback
      >
        {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      
      {/* Main HUD container with fantasy-styled border */}
      <div className="bg-gradient-to-b from-stone-900/95 to-stone-800/95 p-4 pb-6 
                     border-t border-x border-amber-700/70 rounded-t-lg shadow-2xl
                     backdrop-blur-sm text-amber-100">
        {/* Quest and location tracking section */}
        <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            {currentQuest && (
              <ActiveQuestTracker quest={currentQuest} />
            )}
            {gameState.currentLocation && (
              <LocationDisplay currentLocation={gameState.currentLocation} />
            )}
          </div>
          
          <div className="flex justify-end">
            <MinimapPlaceholder />
          </div>
        </div>
        
        {/* Character stats and inventory section */}
        <div className="flex flex-wrap items-center justify-between border-t border-amber-700/30 pt-3">
          <div className="flex items-center space-x-6">
            {mcStats && <PlayerVitals stats={mcStats} magicPower={magicPower} />}
          </div>
          
          <div className="flex items-center space-x-4">
            <InventoryQuickAccess inventory={gameState.inventory || []} />
            <NavigationIcons 
              onOpenCharacterScreen={onOpenCharacterScreen} 
              onOpenQuestLogScreen={onOpenQuestLogScreen} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
