"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Label } from '@/components/ui/label';     // Import Label

interface GameSetupScreenProps {
  onStartGeneration: (data: { // Updated prop signature
    seriesTitle: string;
    characterConcept: string;
    worldContext: string;
  }) => void;
}

export function GameSetupScreen({ onStartGeneration }: GameSetupScreenProps) {
  const [seriesTitle, setSeriesTitle] = useState('');
  const [characterConcept, setCharacterConcept] = useState(''); // New state for character concept
  const [worldContext, setWorldContext] = useState('');     // New state for world context

  const handleStartClick = () => {
    if (seriesTitle.trim() && characterConcept.trim() && worldContext.trim()) {
      onStartGeneration({
        seriesTitle: seriesTitle.trim(),
        characterConcept: characterConcept.trim(),
        worldContext: worldContext.trim(),
      });
    } else {
      alert("Please fill in all fields: Series Title, Character Concept, and World Context.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Game/Chat Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Series Title Input */}
            <div className="space-y-1">
              <Label htmlFor="seriesTitle" className="block text-sm font-medium text-muted-foreground">
                Enter the Series you want to explore:
              </Label>
              <Input
                id="seriesTitle"
                type="text"
                value={seriesTitle}
                onChange={(e) => setSeriesTitle(e.target.value)}
                placeholder="E.g., The Lord of the Rings, Star Wars, etc."
                className="w-full"
              />
            </div>

            {/* Character Concept Textarea */}
            <div className="space-y-1">
              <Label htmlFor="characterConcept" className="block text-sm font-medium text-muted-foreground">
                Your Character Concept:
              </Label>
              <Textarea
                id="characterConcept"
                value={characterConcept}
                onChange={(e) => setCharacterConcept(e.target.value)}
                placeholder="E.g., A grizzled detective in a cyberpunk city, a young mage discovering their powers, etc."
                className="w-full"
                rows={3}
              />
            </div>

            {/* World Context Textarea */}
            <div className="space-y-1">
              <Label htmlFor="worldContext" className="block text-sm font-medium text-muted-foreground">
                Describe the World Context / Initial Lore:
              </Label>
              <Textarea
                id="worldContext"
                value={worldContext}
                onChange={(e) => setWorldContext(e.target.value)}
                placeholder="E.g., A post-apocalyptic wasteland where factions fight for resources, a high fantasy kingdom on the brink of war, etc."
                className="w-full"
                rows={4} // Slightly more rows for potentially more text
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartClick} className="w-full">
            Start Generation
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
