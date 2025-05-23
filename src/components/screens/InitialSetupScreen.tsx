'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SeriesDetails } from '@/types'; // Assuming your types are here
import { Loader2, Terminal } from 'lucide-react'; // Added Terminal icon
import { Progress } from '@/components/ui/progress'; // Added Progress component

// Interface for the generation status response
interface GenerationStatusResponse {
  status: 'idle' | 'in-progress' | 'complete' | 'failed';
  message: string;
  progress: {
    step: string;
    totalSteps: number;
    currentStep: number;
    details?: string;
    percent: number;
    elapsedTimeSec: number;
    startTime: number;
    endTime?: number;
  } | null;
}

interface InitialSetupScreenProps {
  onSetupComplete: (seriesDetails: SeriesDetails) => void;
  onGenerateSeries: (prompt: string) => Promise<SeriesDetails | null>; // Updated prop
}

export default function InitialSetupScreen({ onSetupComplete, onGenerateSeries }: InitialSetupScreenProps) {
  const [seriesPrompt, setSeriesPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDetails, setGeneratedDetails] = useState<SeriesDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  // New state for tracking generation progress
  const [generationStatus, setGenerationStatus] = useState<GenerationStatusResponse | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll for generation status updates when loading
  useEffect(() => {
    // Function to create interval for polling
    const createPollingInterval = () => {
      return setInterval(async () => {
        try {
          const response = await fetch('/api/generation-status');
          if (!response.ok) {
            console.warn('Failed to fetch generation status:', response.statusText);
            return;
          }
          
          const data: GenerationStatusResponse = await response.json();
          setGenerationStatus(data);
          
          // If generation is complete or failed, stop polling
          if (data.status === 'complete' || data.status === 'failed' || data.status === 'idle') {
            if (pollInterval) {
              clearInterval(pollInterval);
              setPollInterval(null);
            }
          }
        } catch (err) {
          console.error('Error fetching generation status:', err);
        }
      }, 1000); // Poll every second
    };

    // Start polling when generation begins
    if (isLoading && !generatedDetails) {
      // Clear any existing interval
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      
      // Create and set the new polling interval
      const interval = createPollingInterval();
      setPollInterval(interval);
      
      // Clean up on unmount or when isLoading becomes false
      return () => {
        clearInterval(interval);
      };
    } else if (!isLoading && pollInterval) {
      // Stop polling when loading is complete
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [isLoading, generatedDetails, pollInterval]); // Added pollInterval to dependency array

  const handleGenerate = async () => {
    if (!seriesPrompt.trim()) {
      setError('Please enter a theme or idea for your series.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedDetails(null); // Clear previous details
    setGenerationStatus(null); // Reset generation status

    try {
      console.log(`Requesting series generation for: ${seriesPrompt}`);
      const details = await onGenerateSeries(seriesPrompt);
      if (details) {
        setGeneratedDetails(details);
        // Ensure lorebook is populated if expected
        if (!details.lorebook || details.lorebook.entries.length === 0) {
            console.warn("Generated details have an empty or missing lorebook, but was expected.");
        } else {
            console.log(`Lorebook generated with ${details.lorebook.entries.length} entries.`);
        }
      } else {
        setError('Failed to generate series details. The generation service might be unavailable or returned no data. Please try again.');
        console.error('Series generation returned null or undefined.');
      }
    } catch (err) {
      console.error('Error during series generation:', err);
      let errorMessage = 'An unexpected error occurred during world generation.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Failed to generate series: ${errorMessage}. Please check the console for more details and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = () => {
    if (generatedDetails) {
      onSetupComplete(generatedDetails);
    }
  };

  if (generatedDetails) {
    return (
      <Card className="w-full max-w-lg mx-auto my-8 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl">World Ready!</CardTitle>
          <CardDescription>Your new adventure awaits in: <span className="font-semibold text-primary">{generatedDetails.seriesTitle}</span></CardDescription>
        </CardHeader>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}> {/* Added this div */}
          <CardContent className="space-y-6 text-sm">
            <div>
              <h3 className="font-semibold text-lg mb-1">Main Character:</h3>
              <p><span className="font-medium">{generatedDetails.mainCharacter.name}</span> - {generatedDetails.mainCharacter.description}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                <p><strong>Strength:</strong> {generatedDetails.mainCharacter.stats.strength}</p>
                <p><strong>Dexterity:</strong> {generatedDetails.mainCharacter.stats.dexterity}</p>
                <p><strong>Intelligence:</strong> {generatedDetails.mainCharacter.stats.intelligence}</p>
                {generatedDetails.mainCharacter.stats.magicPower && <p><strong>Magic Power:</strong> {generatedDetails.mainCharacter.stats.magicPower}</p>}
                {generatedDetails.mainCharacter.stats.luck && <p><strong>Luck:</strong> {generatedDetails.mainCharacter.stats.luck}</p>}
                {generatedDetails.mainCharacter.stats.specialAbility && <p className="col-span-2"><strong>Special Ability:</strong> {generatedDetails.mainCharacter.stats.specialAbility}</p>}
              </div>
            </div>

            {generatedDetails.startingLocation && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Starting Location:</h3>
                <p>{generatedDetails.startingLocation}</p>
              </div>
            )}

            {generatedDetails.initialInventory && generatedDetails.initialInventory.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Initial Inventory:</h3>
                <ul className="list-disc list-inside pl-4">
                  {generatedDetails.initialInventory.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}

            {generatedDetails.initialQuest && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Your First Quest: {generatedDetails.initialQuest.title}</h3>
                <p className="italic mb-1">{generatedDetails.initialQuest.description}</p>
                <h4 className="font-medium mt-2">Objectives:</h4>
                <ul className="list-disc list-inside pl-4">
                  {generatedDetails.initialQuest.objectives.map(obj => <li key={obj}>{obj}</li>)}
                </ul>
                <h4 className="font-medium mt-2">Rewards:</h4>
                <ul className="list-disc list-inside pl-4">
                  {generatedDetails.initialQuest.rewards.map(rew => <li key={rew}>{rew}</li>)}
                </ul>
              </div>
            )}
            
            {generatedDetails.lorebook && generatedDetails.lorebook.entries.length > 0 && (
               <div>
                  <h3 className="font-semibold text-lg mb-1">Lorebook Preview:</h3>
                  <p className="text-xs text-muted-foreground mb-1">{generatedDetails.lorebook.overallSummary.substring(0,150)}...</p>
                  <p className="text-xs">Contains {generatedDetails.lorebook.entries.length} entries. You can view the full lorebook in-game.</p>
               </div>
            )}


            <Button onClick={handleStartGame} className="w-full mt-6 py-3 text-base" size="lg">
              Start Adventure in {generatedDetails.seriesTitle}
            </Button>
          </CardContent>
        </div> {/* Added this div */}
      </Card>
    );
  }

  // Progress display component
  const GenerationProgressDisplay = () => {
    if (!generationStatus || !generationStatus.progress) return null;
    
    const { progress } = generationStatus;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between mb-1 text-sm">
          <div className="flex items-center">
            <Terminal className="w-4 h-4 mr-2 text-primary" />
            <span>{progress.step}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.percent}% • {progress.currentStep}/{progress.totalSteps}
          </span>
        </div>
        
        <Progress value={progress.percent} className="h-2" />
        
        {progress.details && (
          <p className="text-xs text-muted-foreground mt-1">{progress.details}</p>
        )}
        
        <p className="text-xs text-muted-foreground">
          Time elapsed: {Math.floor(progress.elapsedTimeSec / 60)}m {progress.elapsedTimeSec % 60}s
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Adventure</CardTitle>
          <CardDescription>Describe the world, series, or theme you want to play in. The AI will generate the rest!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="e.g., Re:Zero, A cyberpunk city under a dome..."
            value={seriesPrompt}
            onChange={(e) => setSeriesPrompt(e.target.value)}
            disabled={isLoading}
            className="py-3 px-4 text-base"
            onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading && seriesPrompt.trim()) handleGenerate(); }}
          />
          {error && <p className="text-sm text-red-500 animate-shake">{error}</p>}
          {isLoading && <GenerationProgressDisplay />}
          <Button onClick={handleGenerate} disabled={isLoading || !seriesPrompt.trim()} className="w-full py-3 text-base" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {generationStatus?.progress?.step || 'Generating World...'}
              </>
            ) : (
              'Generate World'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
