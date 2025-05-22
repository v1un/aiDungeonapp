// src/components/hud/NavigationIcons.tsx
"use client";

import { User, ScrollText, BookOpen } from 'lucide-react';
// Assuming Button component is available at this path, adjust if necessary
import { Button } from '@/components/ui/button'; 
import Link from 'next/link';

interface NavigationIconsProps {
  onOpenCharacterScreen: () => void;
  onOpenQuestLogScreen: () => void;
  // onOpenLorebook: () => void; // Using direct link for Lorebook
}

export function NavigationIcons({ onOpenCharacterScreen, onOpenQuestLogScreen }: NavigationIconsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={onOpenCharacterScreen} aria-label="Character Screen">
        <User className="h-5 w-5" />
      </Button>
      <Button variant="outline" size="icon" onClick={onOpenQuestLogScreen} aria-label="Quest Log">
        <ScrollText className="h-5 w-5" />
      </Button>
      <Button variant="outline" size="icon" asChild aria-label="Lorebook">
        <Link href="/lorebook">
          <BookOpen className="h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
}
