"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error display
import { ScrollArea } from "@/components/ui/scroll-area"; // For potentially long backstories
import type { GenerateCharacterOutput } from '@/ai/flows/generate-character';

// Alias for clarity, matching the structure from generate-character.ts
interface CharacterData extends GenerateCharacterOutput {}

interface GeneratedCharacterProfileProps {
  characterData: CharacterData | null;
  seriesTitle: string; // Still useful for context, especially on error
  generationError: string | null;
  onStartAdventure: () => void;
}

export function GeneratedCharacterProfile({
  characterData,
  seriesTitle,
  generationError,
  onStartAdventure,
}: GeneratedCharacterProfileProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg">
        {/* Error State */}
        {generationError && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-destructive">Character Generation Failed</CardTitle>
              <CardDescription>For series: {seriesTitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>
                  {generationError}
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex flex-col items-center">
              <Button onClick={onStartAdventure} className="w-full max-w-xs">
                Try Again (Back to Setup)
              </Button>
            </CardFooter>
          </>
        )}

        {/* Loading State (No error, but no character data yet) */}
        {!generationError && !characterData && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Loading Character Profile</CardTitle>
              <CardDescription>Please wait while we retrieve the details for your adventure in {seriesTitle}.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-10">
              {/* You could add a spinner here if desired */}
              <p className="text-muted-foreground">Fetching character data...</p>
            </CardContent>
            <CardFooter className="flex flex-col items-center">
                <Button onClick={onStartAdventure} variant="outline" className="w-full max-w-xs">
                    Cancel (Back to Setup)
                </Button>
            </CardFooter>
          </>
        )}

        {/* Success State (No error, and character data is present) */}
        {!generationError && characterData && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Character Profile Ready!</CardTitle>
              <CardDescription>Your character for '{seriesTitle}' has been generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder-avatar.png" alt={characterData.name} />
                  <AvatarFallback>{characterData.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold">{characterData.name}</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">Backstory:</h3>
                  <ScrollArea className="h-32 w-full rounded-md border p-3 bg-muted/30 text-sm text-muted-foreground">
                    {characterData.backstory}
                  </ScrollArea>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Stats:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(characterData.stats).map(([statName, statValue]) => (
                      <div key={statName} className="bg-muted p-3 rounded-md">
                        <span className="font-semibold capitalize text-sm">
                          {statName.replace(/([A-Z_])/g, ' $1').trim()}: {/* Add space for camelCase or snake_case */}
                        </span>
                        <span className="text-sm"> {String(statValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-1">Skills:</h3>
                  {characterData.skills && characterData.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {characterData.skills.map((skill, index) => (
                        <span key={index} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific skills listed.</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center">
              <Button onClick={onStartAdventure} className="w-full max-w-xs">
                Start Adventure
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
