"use client";

import React, { useState, useEffect } from 'react';
import { GameSetupScreen } from '@/components/screens/GameSetupScreen';
import { GenerationProgressScreen } from '@/components/screens/GenerationProgressScreen';
import { GeneratedCharacterProfile } from '@/components/screens/GeneratedCharacterProfile';
import { Button } from '@/components/ui/button';

// AI Flow Imports
import { generateCharacter, GenerateCharacterOutput } from '@/ai/flows/generate-character';
import { generateWorldDetails } from '@/ai/flows/generate-world-details';
import { generateFaction } from '@/ai/flows/generate-faction';
import { generateLocation } from '@/ai/flows/generate-location';

// Lorebook Schema & Memory Manager Imports
import type { 
  WorldDetail, 
  TypedFaction, 
  TypedLocation,
  Character as CharacterSchemaType 
} from '@/ai/lorebook-schemas';
import { memoryManager } from '@/lib/memory-manager'; 

// Define possible screen states
type ScreenState = 'setup' | 'generating' | 'profile';

interface CharacterData extends GenerateCharacterOutput {}

export default function AdventurePage() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('setup');
  const [seriesTitle, setSeriesTitle] = useState<string>('');
  const [characterConcept, setCharacterConcept] = useState<string>('');
  const [worldContext, setWorldContext] = useState<string>('');
  
  const [worldDetails, setWorldDetails] = useState<WorldDetail | null>(null);
  const [generatedFactions, setGeneratedFactions] = useState<TypedFaction[]>([]);
  const [generatedLocations, setGeneratedLocations] = useState<TypedLocation[]>([]);
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateUniqueId = (typePrefix: string, nameSuffix: string = ''): string => {
    const safeNameSuffix = nameSuffix.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return `${typePrefix}_${safeNameSuffix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  };

  const handleStartGeneration = async (data: {
    seriesTitle: string;
    characterConcept: string;
    worldContext: string;
  }) => {
    setSeriesTitle(data.seriesTitle);
    setCharacterConcept(data.characterConcept);
    setWorldContext(data.worldContext);
    setWorldDetails(null);
    setGeneratedFactions([]);
    setGeneratedLocations([]);
    setCharacterData(null);
    setGenerationError(null);
    setIsGenerating(true);
    setCurrentScreen('generating');

    let generationSucceeded = false;

    try {
      console.log("[PAGE] Attempting to generate world details...");
      const rawWorldDetails = await generateWorldDetails({
        seriesTitle: data.seriesTitle,
        playerWorldContext: data.worldContext,
      });
      setWorldDetails(rawWorldDetails);
      const worldDetailId = generateUniqueId('wd', data.seriesTitle);
      await memoryManager.addEntity({ ...rawWorldDetails, id: worldDetailId, type: 'worldDetail' });
      console.log(`[PAGE] World details generated and stored in memory with ID: ${worldDetailId}`);

      const factionConcepts = ["The Shadow Syndicate", "Keepers of the Ancient Light", "The Ironclad Merchants Guild"]; 
      const factions: TypedFaction[] = [];
      console.log("[PAGE] Attempting to generate factions...");
      for (const concept of factionConcepts) {
        try {
          const faction = await generateFaction({
            seriesTitle: data.seriesTitle,
            worldDetails: rawWorldDetails,
            factionConcept: concept,
          });
          const factionWithId = { ...faction, id: faction.id || generateUniqueId('fac', faction.name) };
          factions.push(factionWithId);
          await memoryManager.addEntity(factionWithId);
          console.log(`[PAGE] Faction "${factionWithId.name}" generated and stored in memory with ID: ${factionWithId.id}`);
        } catch (e) {
          console.error(`[PAGE] Failed to generate faction for concept: "${concept}"`, e);
        }
      }
      setGeneratedFactions(factions);

      const locationConcepts = ["The Whispering Chasm", "Old Town Market Square", "The Sunken Library"];
      const locations: TypedLocation[] = [];
      console.log("[PAGE] Attempting to generate locations...");
      for (const concept of locationConcepts) {
        try {
          const location = await generateLocation({
            seriesTitle: data.seriesTitle,
            worldDetails: rawWorldDetails,
            locationConcept: concept,
          });
          const locationWithId = { ...location, id: location.id || generateUniqueId('loc', location.name) };
          locations.push(locationWithId);
          await memoryManager.addEntity(locationWithId);
          console.log(`[PAGE] Location "${locationWithId.name}" generated and stored in memory with ID: ${locationWithId.id}`);
        } catch (e) {
          console.error(`[PAGE] Failed to generate location for concept: "${concept}"`, e);
        }
      }
      setGeneratedLocations(locations);

      console.log("[PAGE] Attempting to generate character...");
      const rawCharacterData = await generateCharacter({
        seriesTitle: data.seriesTitle,
        characterConcept: data.characterConcept,
        worldContext: data.worldContext,
        worldDetails: rawWorldDetails,
        factions: factions,
        locations: locations,
      });
      setCharacterData(rawCharacterData);
      const characterId = generateUniqueId('char', rawCharacterData.name);
      const typedCharacterData: CharacterSchemaType & { id: string; type: 'character' } = {
        ...rawCharacterData,
        id: characterId,
        type: 'character',
      };
      await memoryManager.addEntity(typedCharacterData);
      console.log(`[PAGE] Character "${typedCharacterData.name}" generated and stored in memory with ID: ${characterId}`);
      
      generationSucceeded = true; // Mark as successful if all critical parts complete

    } catch (error) {
      console.error("[PAGE] Critical AI Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during critical generation stages.";
      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
      console.log("[PAGE] Generation process finished. isGenerating:", false);
      
      // Log memory contents if generation was successful (characterData is the last critical piece)
      if (generationSucceeded && !generationError) { // Check generationSucceeded flag
        const logMemory = async () => {
          console.log("--- Verifying Memory Manager Contents ---");
          console.log("Stored World Details:", await memoryManager.getAllEntitiesOfType('worldDetail'));
          console.log("Stored Factions:", await memoryManager.getAllEntitiesOfType('faction'));
          console.log("Stored Locations:", await memoryManager.getAllEntitiesOfType('location'));
          console.log("Stored Characters:", await memoryManager.getAllEntitiesOfType('character'));
          console.log("--- End Memory Manager Contents ---");
        };
        logMemory();
      }
    }
  };
  
  const handleFakeProgressComplete = () => {
    if (!isGenerating && (characterData || generationError)) { 
      setCurrentScreen('profile');
    }
  };

  useEffect(() => {
    if (currentScreen === 'generating' && !isGenerating && (characterData || generationError)) {
      setCurrentScreen('profile');
    }
  }, [isGenerating, characterData, generationError, currentScreen]);

  const handleStartAdventure = () => {
    setCurrentScreen('setup');
    setSeriesTitle('');
    setCharacterConcept('');
    setWorldContext('');
    setWorldDetails(null);
    setGeneratedFactions([]);
    setGeneratedLocations([]);
    setCharacterData(null);
    setGenerationError(null);
    setIsGenerating(false);
  };

  if (currentScreen === 'setup') {
    return <GameSetupScreen onStartGeneration={handleStartGeneration} />;
  }

  if (currentScreen === 'generating') {
    return <GenerationProgressScreen onGenerationComplete={handleFakeProgressComplete} />;
  }

  if (currentScreen === 'profile') {
    return (
      <GeneratedCharacterProfile
        characterData={characterData} 
        seriesTitle={seriesTitle}
        generationError={generationError}
        onStartAdventure={handleStartAdventure}
        generatedFactions={generatedFactions}   // Pass factions
        generatedLocations={generatedLocations} // Pass locations
        // The characterName and characterDescription props were removed from GeneratedCharacterProfile in a previous step
        // as characterData now contains all necessary fields.
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="mb-4">Loading or error state...</p>
      <Button onClick={() => setCurrentScreen('setup')}>Reset to Setup (Dev)</Button>
    </div>
  );
}
