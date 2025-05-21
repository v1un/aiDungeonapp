
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SeriesDetails } from '@/types'; // Assuming SeriesDetails includes lorebook
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SERIES_DETAILS_STORAGE_KEY = 'mysticChatways_seriesDetails';

export default function LorebookPage() {
  const [seriesDetails, setSeriesDetails] = useState<SeriesDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedSeriesDetails = localStorage.getItem(SERIES_DETAILS_STORAGE_KEY);
      if (storedSeriesDetails) {
        const parsedDetails: SeriesDetails = JSON.parse(storedSeriesDetails);
        setSeriesDetails(parsedDetails);
      } else {
        setError("No series data found. Please start a game in the chat to generate lore.");
      }
    } catch (e) {
      console.error("Error loading or parsing series details from localStorage:", e);
      setError("Failed to load lorebook data. It might be corrupted.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-4 w-4/5 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-20 w-full mt-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !seriesDetails?.lorebook) {
    return (
      <Alert variant="destructive" className="shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || "Lorebook content is unavailable for the current series."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{seriesDetails.seriesTitle} - Lorebook</CardTitle>
        <CardDescription className="text-muted-foreground italic">
          A glimpse into the world of {seriesDetails.seriesTitle}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {seriesDetails.lorebook}
        </div>
      </CardContent>
    </Card>
  );
}
