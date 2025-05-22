"use client";

import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GenerationProgressScreenProps {
  onFakeProgressComplete: () => void; // Renamed prop
}

const generationMessages = [
  "Initializing generation...",
  "Consulting ancient knowledge banks...",
  "Generating world details and lore...",
  "Crafting character concept...",
  "Assigning character stats and abilities...",
  "Finalizing character profile...",
  "Almost there..."
];

const MESSAGE_DURATION = 1800; // ms

export function GenerationProgressScreen({ onFakeProgressComplete }: GenerationProgressScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(((currentMessageIndex + 1) / generationMessages.length) * 100);

    // Check if it's the last message
    if (currentMessageIndex >= generationMessages.length - 1) {
      const timer = setTimeout(() => {
        onFakeProgressComplete(); // Call the renamed prop
      }, MESSAGE_DURATION);
      return () => clearTimeout(timer);
    }

    // Otherwise, set interval for next message
    const intervalId = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => prevIndex + 1);
    }, MESSAGE_DURATION);

    return () => clearInterval(intervalId);
  }, [currentMessageIndex, onFakeProgressComplete]); // Added onFakeProgressComplete to dependency array

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="mb-4">
          <CardTitle className="text-center text-xl">Generating Your Adventure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-center">
            <p className="text-muted-foreground h-6">
              {generationMessages[currentMessageIndex]}
            </p>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
