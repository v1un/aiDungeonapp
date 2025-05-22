// src/components/hud/NavigationIcons.tsx
"use client";

import { User, ScrollText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavigationIconsProps {
  onOpenCharacterScreen: () => void;
  onOpenQuestLogScreen: () => void;
}

export function NavigationIcons({ onOpenCharacterScreen, onOpenQuestLogScreen }: NavigationIconsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onOpenCharacterScreen} 
              className="h-9 w-9 border-amber-800/70 bg-stone-800 hover:bg-amber-900/50 hover:text-amber-200"
            >
              <User className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Character</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onOpenQuestLogScreen}
              className="h-9 w-9 border-amber-800/70 bg-stone-800 hover:bg-amber-900/50 hover:text-amber-200"
            >
              <ScrollText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Quest Log</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              asChild
              className="h-9 w-9 border-amber-800/70 bg-stone-800 hover:bg-amber-900/50 hover:text-amber-200"
            >
              <Link href="/lorebook">
                <BookOpen className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Lorebook</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
