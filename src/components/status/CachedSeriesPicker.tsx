'use client';

import React, { useState, useEffect } from 'react';
import { getCachedSeriesNames, cleanupExpiredCache } from '@/lib/series-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface CachedSeriesPickerProps {
  onSelect: (seriesName: string) => void;
}

/**
 * Component for displaying and selecting cached series
 * This is shown when there are AI API issues to provide alternative options
 */
export default function CachedSeriesPicker({ onSelect }: CachedSeriesPickerProps) {
  const [cachedSeries, setCachedSeries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Clean up expired cache entries first
    cleanupExpiredCache();
    
    // Then get the list of valid cached series
    const seriesList = getCachedSeriesNames();
    setCachedSeries(seriesList);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Checking for cached game worlds...</div>;
  }

  if (cachedSeries.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={20} />
            <p>No cached game worlds found. Please try a different series name.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previously Generated Worlds</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          The AI service is currently experiencing issues. You can choose one of these previously generated worlds:
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {cachedSeries.map((series) => (
            <Button 
              key={series} 
              variant="outline"
              className="text-left h-auto py-2 px-3 justify-start"
              onClick={() => onSelect(series)}
            >
              {series}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
