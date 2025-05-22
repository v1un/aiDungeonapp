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
      <Link href="/lorebook" passHref legacyBehavior>
        {/*
          The Button component needs to be a simple styled anchor if `asChild` is used with `legacyBehavior`.
          Or, remove `legacyBehavior` and `asChild` if the Button can directly act as a Link.
          Using `asChild` implies the child of Link (Button) will take over the `<a>` tag rendering.
          The example provided uses `<a>` as a child of Button, which is unusual with `asChild`.
          Correct usage with `asChild` and `legacyBehavior`: Link renders `<a>`, Button gets `href`.
          Alternatively, if Button supports `href` directly (Next.js 13+ style):
          <Button variant="outline" size="icon" asChild aria-label="Lorebook">
             <Link href="/lorebook"><BookOpen className="h-5 w-5" /></Link>
          </Button>
          Given the example's structure, I'll assume the Button needs to wrap an `<a>` tag for styling,
          which is common when `asChild` is used with some UI libraries.
          The example's `<a><BookOpen.../></a>` inside Button with `asChild` is a bit confusing.
          A more standard way for `asChild` with `legacyBehavior` is:
          <Link href="/lorebook" passHref legacyBehavior>
            <Button as="a" variant="outline" size="icon" aria-label="Lorebook">
              <BookOpen className="h-5 w-5" />
            </Button>
          </Link>
          Or, if Button is just a styled component and doesn't inherently handle routing:
        */}
        <Button variant="outline" size="icon" asChild aria-label="Lorebook">
          {/* The `<a>` tag is critical here for Next.js Link with `legacyBehavior` */}
          <a><BookOpen className="h-5 w-5" /></a>
        </Button>
      </Link>
    </div>
  );
}
