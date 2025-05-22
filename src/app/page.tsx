"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import { GameSetupScreen } from '@/components/screens/GameSetupScreen';
import { GenerationProgressScreen } from '@/components/screens/GenerationProgressScreen';
import { GeneratedCharacterProfile } from '@/components/screens/GeneratedCharacterProfile';
import { Button } from '@/components/ui/button';
import { generateCharacter, GenerateCharacterOutput } from '@/ai/flows/generate-character'; // Import AI flow

// Define possible screen states
type ScreenState = 'setup' | 'generating' | 'profile';

// Updated CharacterData interface to match GenerateCharacterOutput
interface CharacterData extends GenerateCharacterOutput {}

export default function AdventurePage() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('setup');
  const [seriesTitle, setSeriesTitle] = useState<string>('');
  const [characterConcept, setCharacterConcept] = useState<string>(''); // New state
  const [worldContext, setWorldContext] = useState<string>(''); // New state
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // New state for loading
  const [generationError, setGenerationError] = useState<string | null>(null); // New state for error

  const handleStartGeneration = async (data: {
    seriesTitle: string;
    characterConcept: string;
    worldContext: string;
  }) => {
    setSeriesTitle(data.seriesTitle);
    setCharacterConcept(data.characterConcept);
    setWorldContext(data.worldContext);
    setCharacterData(null);
    setGenerationError(null);
    setIsGenerating(true); // Indicate that generation is starting
    setCurrentScreen('generating'); // Show generation progress screen

    // Start AI generation immediately
    try {
      const aiResult = await generateCharacter({
        seriesTitle: data.seriesTitle,
        characterConcept: data.characterConcept,
        worldContext: data.worldContext,
      });
      setCharacterData(aiResult);
    } catch (error) {
      console.error("AI Character Generation Error:", error);
      setGenerationError(error instanceof Error ? error.message : "An unknown error occurred during character generation.");
    } finally {
      setIsGenerating(false); // Indicate that generation has finished (success or fail)
    }
  };
  
  // This function is called by GenerationProgressScreen when its "fake" progress animation finishes.
  const handleFakeProgressComplete = () => {
    // If AI generation is already done (isGenerating is false), and we have data or an error,
    // then it's safe to transition to the profile screen.
    // The useEffect below will also catch this, but this can make the transition quicker
    // if the animation finishes after the AI.
    if (!isGenerating && (characterData || generationError)) {
      setCurrentScreen('profile');
    }
    // If AI is still generating, GenerationProgressScreen will continue to show.
    // The useEffect will handle transitioning once isGenerating becomes false.
  };

  // useEffect to transition to profile screen once generation is done
  useEffect(() => {
    // Only transition if we are currently on the 'generating' screen AND generation is no longer active
    if (currentScreen === 'generating' && !isGenerating && (characterData || generationError)) {
      setCurrentScreen('profile');
    }
  }, [isGenerating, characterData, generationError, currentScreen]);

  const handleStartAdventure = () => {
    // Reset all relevant states for a new setup
    setCurrentScreen('setup');
    setSeriesTitle('');
    setCharacterConcept('');
    setWorldContext('');
    setCharacterData(null);
    setGenerationError(null);
    setIsGenerating(false);
  };

  if (currentScreen === 'setup') {
    return <GameSetupScreen onStartGeneration={handleStartGeneration} />;
  }

  if (currentScreen === 'generating') {
    // Pass isGenerating if GenerationProgressScreen wants to show a different message
    // e.g. "Waiting for AI..." vs "Generating..."
    // For now, GenerationProgressScreen is self-contained in its animation.
    return <GenerationProgressScreen onGenerationComplete={handleFakeProgressComplete} />;
  }

  if (currentScreen === 'profile') {
    // GeneratedCharacterProfile will be updated in a subsequent step
    // to correctly use characterData and display errors.
    // For now, we pass the new props.
    return (
      <GeneratedCharacterProfile
        characterData={characterData} 
        seriesTitle={seriesTitle} // Keep for context, e.g. if characterData is null due to error
        generationError={generationError}
        onStartAdventure={handleStartAdventure}
        // The old props characterName and characterDescription are now part of characterData
        // These will be removed/refactored in GeneratedCharacterProfile's own update task
        characterName={characterData?.name || "Error"} // Temporary, will be handled by GeneratedCharacterProfile
        characterDescription={characterData?.backstory || generationError || "No data"} // Temporary
      />
    );
  }

  // Fallback or initial loading state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="mb-4">Loading or error state...</p>
      <Button onClick={() => setCurrentScreen('setup')}>Reset to Setup (Dev)</Button>
    </div>
  );
}
