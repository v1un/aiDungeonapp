
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SeriesDetails, Lorebook, LoreEntry } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SERIES_DETAILS_STORAGE_KEY = 'mysticChatways_seriesDetails';

// Helper to parse markdown-like bold/italics for display
const parseSimpleMarkdown = (text: string) => {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index} className="text-accent italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};


export default function LorebookPage() {
  const [seriesDetails, setSeriesDetails] = useState<SeriesDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedSeriesDetails = localStorage.getItem(SERIES_DETAILS_STORAGE_KEY);
      if (storedSeriesDetails) {
        const parsedDetails: SeriesDetails = JSON.parse(storedSeriesDetails);
        // Basic validation for new lorebook structure
        if (parsedDetails.lorebook && typeof parsedDetails.lorebook === 'object' && 'overallSummary' in parsedDetails.lorebook && 'entries' in parsedDetails.lorebook) {
          setSeriesDetails(parsedDetails);
        } else {
          // Handle old format or corrupted data
          console.warn("Stored lorebook data is in an outdated or unexpected format.");
          setError("Lorebook data seems to be in an old format. Please restart the game with a new series to generate an updated lorebook.");
          // Optionally, clear the outdated item: localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY);
        }
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
      <div className="space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-4/5 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-xl">
            <CardHeader>
              <Skeleton className="h-6 w-2/5" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !seriesDetails?.lorebook || !seriesDetails.lorebook.entries) {
    return (
      <Alert variant="destructive" className="shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error Accessing Lorebook</AlertTitle>
        <AlertDescription>
          {error || "Lorebook content is unavailable, incomplete, or in an old format. Please try starting a new game."}
        </AlertDescription>
      </Alert>
    );
  }

  const { lorebook, seriesTitle } = seriesDetails;

  const groupedEntries = lorebook.entries.reduce((acc, entry) => {
    const category = entry.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(entry);
    return acc;
  }, {} as Record<string, LoreEntry[]>);

  return (
    <div className="space-y-6">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">{seriesTitle} - World Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {parseSimpleMarkdown(lorebook.overallSummary)}
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold text-primary mt-8 mb-4">Detailed Lore Entries</h2>
      {Object.entries(groupedEntries).length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedEntries).map(([category, entries]) => (
            <AccordionItem value={category} key={category} className="border border-border/70 rounded-lg shadow-md bg-card/70 backdrop-blur-sm">
              <AccordionTrigger className="px-6 py-4 text-lg hover:no-underline text-accent">
                <div className="flex items-center">
                  <Info size={20} className="mr-3 text-accent/80" /> {category} ({entries.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pt-0 pb-4 space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.name} className="bg-background/60 shadow-inner">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md text-primary/90">{parseSimpleMarkdown(entry.name)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
                        {parseSimpleMarkdown(entry.description)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
         <Alert>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>No Detailed Entries</AlertTitle>
            <AlertDescription>
              No specific lore entries were found for this series. The overview might contain all available information.
            </AlertDescription>
          </Alert>
      )}
    </div>
  );
}
