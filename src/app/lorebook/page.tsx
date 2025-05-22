"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SeriesDetails, LoreEntry } from '@/types';
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
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    try {
      // First check the dedicated storage key
      const storedSeriesDetails = localStorage.getItem(SERIES_DETAILS_STORAGE_KEY);
      
      if (storedSeriesDetails) {
        try {
          const parsedDetails: SeriesDetails = JSON.parse(storedSeriesDetails);
          
          // Enhanced validation for lorebook structure
          if (parsedDetails.lorebook && 
              typeof parsedDetails.lorebook === 'object' && 
              'overallSummary' in parsedDetails.lorebook && 
              'entries' in parsedDetails.lorebook &&
              Array.isArray(parsedDetails.lorebook.entries)) {
            setSeriesDetails(parsedDetails);
          } else {
            console.warn("Stored lorebook data is in an outdated or unexpected format.");
            setError("Lorebook data seems to be in an old format. Please start a new game to generate an updated lorebook.");
            
            // Clear invalid lorebook data
            localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY);
          }
        } catch (parseError) {
          console.error("Error parsing series details:", parseError);
          setError("Failed to parse lorebook data. The stored data might be corrupted.");
          
          // Clear invalid lorebook data
          localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY);
        }
      } else {
        // If not found in the dedicated key, check if we have any active game session
        const storedSessions = localStorage.getItem('mysticChatways_gameSessions');
        
        if (storedSessions) {
          try {
            const sessions = JSON.parse(storedSessions);
            
            // Get the most recent session with series details
            if (sessions && Array.isArray(sessions) && sessions.length > 0) {
              const sessionsWithLorebooks = sessions.filter(
                (s: {gameState?: {seriesDetails?: {lorebook?: object}}}) => s.gameState?.seriesDetails?.lorebook
              );
              
              if (sessionsWithLorebooks.length > 0) {
                // Sort by last played to get the most recent
                const recentSessions = [...sessionsWithLorebooks].sort(
                  (a: {lastPlayed: number}, b: {lastPlayed: number}) => b.lastPlayed - a.lastPlayed
                );
                const mostRecentSession = recentSessions[0];
                
                if (mostRecentSession.gameState?.seriesDetails) {
                  // Found series details in the game session, use these
                  setSeriesDetails(mostRecentSession.gameState.seriesDetails);
                  
                  // Also update our dedicated storage for future use
                  localStorage.setItem(SERIES_DETAILS_STORAGE_KEY, JSON.stringify(mostRecentSession.gameState.seriesDetails));
                  console.log("Retrieved series details from active game session");
                  return;
                }
              }
            }
            
            setError("No lorebook data found in any active game sessions. Please start a game to generate a lorebook.");
          } catch (sessionError) {
            console.error("Error parsing game sessions:", sessionError);
            setError("Failed to retrieve lorebook data from game sessions.");
          }
        } else {
          setError("No game sessions found. Please start a game in the chat to generate lore.");
        }
      }
    } catch (e) {
      console.error("Error loading or parsing series details from localStorage:", e);
      setError("Failed to load lorebook data. It might be corrupted.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to filter entries based on search term (defined in the component scope but not used)

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
  
  // Function to filter entries based on search term
  const filterEntries = (term: string, entriesObj: Record<string, LoreEntry[]>): Record<string, LoreEntry[]> => {
    if (!term.trim()) {
      // If no search term, return all entries
      return entriesObj;
    }
    
    const filtered: Record<string, LoreEntry[]> = {};
    const lowerTerm = term.toLowerCase();
    
    Object.entries(entriesObj).forEach(([category, categoryEntries]) => {
      const matchingEntries = categoryEntries.filter(entry => 
        entry.name.toLowerCase().includes(lowerTerm) || 
        entry.description.toLowerCase().includes(lowerTerm)
      );
      
      if (matchingEntries.length > 0) {
        filtered[category] = matchingEntries;
      }
    });
    
    return filtered;
  };
  
  // Get filtered entries based on search term
  const filteredEntries = searchTerm ? filterEntries(searchTerm, groupedEntries) : groupedEntries;
  
  // Count total matches when searching
  const totalMatchCount = searchTerm ? 
    Object.values(filteredEntries).reduce((sum, entries) => sum + entries.length, 0) : 
    lorebook.entries.length;

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
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{lorebook.entries.length}</div>
              <div className="text-xs text-muted-foreground">Total Entries</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {Object.keys(groupedEntries).length}
              </div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(lorebook.entries.reduce((sum, entry) => sum + entry.description.length, 0) / 1000)}K
              </div>
              <div className="text-xs text-muted-foreground">Characters of Lore</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {
                  lorebook.entries.filter(entry => 
                    entry.category.toLowerCase().includes('location') || 
                    entry.category.toLowerCase().includes('region')
                  ).length
                }
              </div>
              <div className="text-xs text-muted-foreground">Locations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold text-primary mt-8 mb-4">Detailed Lore Entries</h2>
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search lore entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>
      {/* Search results summary */}
      {searchTerm && (
        <div className="mb-4 text-sm text-foreground/80">
          {totalMatchCount > 0 ? 
            `Found ${totalMatchCount} ${totalMatchCount === 1 ? 'entry' : 'entries'} matching "${searchTerm}"` : 
            `No entries found matching "${searchTerm}"`}
        </div>
      )}
      {Object.entries(filteredEntries).length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(filteredEntries).map(([category, entries]) => (
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
